"""
API Reliability and Monitoring Service for BookedBarber V2.
Provides enterprise-grade reliability patterns for third-party API integrations:
- Circuit breaker patterns with intelligent failure detection
- Exponential backoff retry strategies with jitter
- Real-time API health monitoring and alerting
- Auto-recovery mechanisms and failover handling
- Rate limiting and quota management
- Webhook reliability and replay mechanisms
- Performance metrics and SLA tracking
"""

import asyncio
import logging
import time
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import httpx
import json
from sqlalchemy.orm import Session

from models.integration import Integration
from config import settings

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"          # Failing, requests blocked
    HALF_OPEN = "half_open" # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker behavior"""
    failure_threshold: int = 5          # Failures before opening circuit
    success_threshold: int = 3          # Successes needed to close circuit
    timeout: int = 60                   # Seconds before trying half-open
    max_timeout: int = 300              # Maximum timeout in seconds
    failure_rate_threshold: float = 0.5 # Failure rate to open circuit
    min_requests: int = 10              # Minimum requests before rate calculation


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    requests_per_second: int = 10
    requests_per_minute: int = 600
    requests_per_hour: int = 3600
    burst_allowance: int = 20


@dataclass
class ApiHealthMetrics:
    """API health and performance metrics"""
    success_count: int = 0
    failure_count: int = 0
    avg_response_time: float = 0.0
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    uptime_percentage: float = 100.0
    rate_limit_hits: int = 0
    circuit_breaker_trips: int = 0


class CircuitBreaker:
    """Intelligent circuit breaker with adaptive failure detection"""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.next_attempt_time = None
        self.request_history = []
        
    async def call(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit breaker {self.name} moving to HALF_OPEN")
            else:
                raise Exception(f"Circuit breaker {self.name} is OPEN")
        
        try:
            start_time = time.time()
            result = await func(*args, **kwargs)
            response_time = time.time() - start_time
            
            self._record_success(response_time)
            return result
            
        except Exception as e:
            self._record_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit should attempt reset"""
        if self.next_attempt_time is None:
            return True
        return time.time() >= self.next_attempt_time
    
    def _record_success(self, response_time: float):
        """Record successful request"""
        self.success_count += 1
        self.request_history.append({
            "timestamp": time.time(),
            "success": True,
            "response_time": response_time
        })
        
        if self.state == CircuitState.HALF_OPEN:
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info(f"Circuit breaker {self.name} CLOSED after recovery")
        
        self._cleanup_history()
    
    def _record_failure(self):
        """Record failed request"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        self.request_history.append({
            "timestamp": time.time(),
            "success": False
        })
        
        if self.state == CircuitState.CLOSED:
            if self._should_open_circuit():
                self._open_circuit()
        elif self.state == CircuitState.HALF_OPEN:
            self._open_circuit()
        
        self._cleanup_history()
    
    def _should_open_circuit(self) -> bool:
        """Determine if circuit should open based on failure patterns"""
        # Simple threshold check
        if self.failure_count >= self.config.failure_threshold:
            return True
        
        # Failure rate check (if we have enough requests)
        recent_requests = [
            r for r in self.request_history 
            if time.time() - r["timestamp"] <= 60  # Last minute
        ]
        
        if len(recent_requests) >= self.config.min_requests:
            failures = len([r for r in recent_requests if not r["success"]])
            failure_rate = failures / len(recent_requests)
            return failure_rate >= self.config.failure_rate_threshold
        
        return False
    
    def _open_circuit(self):
        """Open the circuit breaker"""
        self.state = CircuitState.OPEN
        timeout = min(self.config.timeout * (2 ** min(self.failure_count - 1, 5)), 
                     self.config.max_timeout)
        self.next_attempt_time = time.time() + timeout
        logger.warning(f"Circuit breaker {self.name} OPENED, timeout: {timeout}s")
    
    def _cleanup_history(self):
        """Remove old history entries"""
        cutoff_time = time.time() - 300  # Keep 5 minutes of history
        self.request_history = [
            r for r in self.request_history 
            if r["timestamp"] > cutoff_time
        ]


class RateLimiter:
    """Token bucket rate limiter with multiple time windows"""
    
    def __init__(self, name: str, config: RateLimitConfig):
        self.name = name
        self.config = config
        self.tokens = {
            "second": config.burst_allowance,
            "minute": config.requests_per_minute,
            "hour": config.requests_per_hour
        }
        self.last_refill = {
            "second": time.time(),
            "minute": time.time(),
            "hour": time.time()
        }
        self.request_counts = {
            "second": 0,
            "minute": 0,
            "hour": 0
        }
    
    async def acquire(self, tokens: int = 1) -> bool:
        """Acquire tokens from rate limiter"""
        self._refill_tokens()
        
        # Check all time windows
        for window in ["second", "minute", "hour"]:
            if self.tokens[window] < tokens:
                logger.warning(f"Rate limit exceeded for {self.name} ({window})")
                return False
        
        # Consume tokens
        for window in ["second", "minute", "hour"]:
            self.tokens[window] -= tokens
            self.request_counts[window] += tokens
        
        return True
    
    def _refill_tokens(self):
        """Refill token buckets based on elapsed time"""
        current_time = time.time()
        
        # Refill per-second bucket
        elapsed = current_time - self.last_refill["second"]
        if elapsed >= 1.0:
            self.tokens["second"] = min(
                self.config.burst_allowance,
                self.tokens["second"] + int(elapsed * self.config.requests_per_second)
            )
            self.last_refill["second"] = current_time
        
        # Refill per-minute bucket
        elapsed = current_time - self.last_refill["minute"]
        if elapsed >= 60.0:
            self.tokens["minute"] = self.config.requests_per_minute
            self.last_refill["minute"] = current_time
            self.request_counts["minute"] = 0
        
        # Refill per-hour bucket
        elapsed = current_time - self.last_refill["hour"]
        if elapsed >= 3600.0:
            self.tokens["hour"] = self.config.requests_per_hour
            self.last_refill["hour"] = current_time
            self.request_counts["hour"] = 0


class ApiReliabilityService:
    """
    Enterprise-grade API reliability service for BookedBarber V2.
    Ensures 95%+ API sync reliability through intelligent failure handling.
    """
    
    def __init__(self):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.rate_limiters: Dict[str, RateLimiter] = {}
        self.health_metrics: Dict[str, ApiHealthMetrics] = {}
        self.retry_configs: Dict[str, RetryConfig] = {}
        
        # Default configurations for different API types
        self.default_configs = {
            "stripe": {
                "circuit_breaker": CircuitBreakerConfig(
                    failure_threshold=3,
                    timeout=30,
                    failure_rate_threshold=0.3
                ),
                "rate_limit": RateLimitConfig(
                    requests_per_second=25,
                    requests_per_minute=1000,
                    burst_allowance=50
                ),
                "retry": RetryConfig(
                    max_attempts=3,
                    base_delay=1.0,
                    max_delay=30.0
                )
            },
            "google_business": {
                "circuit_breaker": CircuitBreakerConfig(
                    failure_threshold=5,
                    timeout=60,
                    failure_rate_threshold=0.4
                ),
                "rate_limit": RateLimitConfig(
                    requests_per_second=10,
                    requests_per_minute=1000,
                    burst_allowance=20
                ),
                "retry": RetryConfig(
                    max_attempts=4,
                    base_delay=2.0,
                    max_delay=60.0
                )
            },
            "sendgrid": {
                "circuit_breaker": CircuitBreakerConfig(
                    failure_threshold=5,
                    timeout=45,
                    failure_rate_threshold=0.4
                ),
                "rate_limit": RateLimitConfig(
                    requests_per_second=20,
                    requests_per_minute=600,
                    burst_allowance=40
                ),
                "retry": RetryConfig(
                    max_attempts=3,
                    base_delay=1.5,
                    max_delay=45.0
                )
            },
            "twilio": {
                "circuit_breaker": CircuitBreakerConfig(
                    failure_threshold=3,
                    timeout=30,
                    failure_rate_threshold=0.3
                ),
                "rate_limit": RateLimitConfig(
                    requests_per_second=15,
                    requests_per_minute=600,
                    burst_allowance=30
                ),
                "retry": RetryConfig(
                    max_attempts=3,
                    base_delay=1.0,
                    max_delay=30.0
                )
            },
            "meta_business": {
                "circuit_breaker": CircuitBreakerConfig(
                    failure_threshold=4,
                    timeout=60,
                    failure_rate_threshold=0.4
                ),
                "rate_limit": RateLimitConfig(
                    requests_per_second=8,
                    requests_per_minute=200,
                    burst_allowance=15
                ),
                "retry": RetryConfig(
                    max_attempts=4,
                    base_delay=2.0,
                    max_delay=60.0
                )
            }
        }
    
    def get_or_create_circuit_breaker(self, api_name: str, integration_type: str) -> CircuitBreaker:
        """Get or create circuit breaker for API"""
        key = f"{integration_type}:{api_name}"
        if key not in self.circuit_breakers:
            config = self.default_configs.get(
                integration_type, 
                self.default_configs["stripe"]
            )["circuit_breaker"]
            self.circuit_breakers[key] = CircuitBreaker(key, config)
        return self.circuit_breakers[key]
    
    def get_or_create_rate_limiter(self, api_name: str, integration_type: str) -> RateLimiter:
        """Get or create rate limiter for API"""
        key = f"{integration_type}:{api_name}"
        if key not in self.rate_limiters:
            config = self.default_configs.get(
                integration_type,
                self.default_configs["stripe"]
            )["rate_limit"]
            self.rate_limiters[key] = RateLimiter(key, config)
        return self.rate_limiters[key]
    
    def get_retry_config(self, integration_type: str) -> RetryConfig:
        """Get retry configuration for integration type"""
        return self.default_configs.get(
            integration_type,
            self.default_configs["stripe"]
        )["retry"]
    
    async def reliable_api_call(
        self,
        api_name: str,
        integration_type: str,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute API call with full reliability patterns:
        - Rate limiting
        - Circuit breaker protection
        - Exponential backoff retry
        - Health monitoring
        """
        circuit_breaker = self.get_or_create_circuit_breaker(api_name, integration_type)
        rate_limiter = self.get_or_create_rate_limiter(api_name, integration_type)
        retry_config = self.get_retry_config(integration_type)
        
        # Initialize health metrics if not exists
        key = f"{integration_type}:{api_name}"
        if key not in self.health_metrics:
            self.health_metrics[key] = ApiHealthMetrics()
        
        # Rate limiting
        if not await rate_limiter.acquire():
            self.health_metrics[key].rate_limit_hits += 1
            raise Exception(f"Rate limit exceeded for {api_name}")
        
        # Execute with circuit breaker and retry
        return await self._execute_with_retry(
            circuit_breaker, func, retry_config, key, *args, **kwargs
        )
    
    async def _execute_with_retry(
        self,
        circuit_breaker: CircuitBreaker,
        func: Callable,
        retry_config: RetryConfig,
        metrics_key: str,
        *args,
        **kwargs
    ) -> Any:
        """Execute function with circuit breaker and exponential backoff retry"""
        last_exception = None
        
        for attempt in range(retry_config.max_attempts):
            try:
                start_time = time.time()
                
                # Execute with circuit breaker protection
                result = await circuit_breaker.call(func, *args, **kwargs)
                
                # Update health metrics
                response_time = time.time() - start_time
                self._update_success_metrics(metrics_key, response_time)
                
                return result
                
            except Exception as e:
                last_exception = e
                self._update_failure_metrics(metrics_key, e)
                
                # Don't retry if circuit breaker is open
                if circuit_breaker.state == CircuitState.OPEN:
                    self.health_metrics[metrics_key].circuit_breaker_trips += 1
                    break
                
                # Don't retry on last attempt
                if attempt == retry_config.max_attempts - 1:
                    break
                
                # Calculate delay with exponential backoff and jitter
                delay = self._calculate_retry_delay(attempt, retry_config)
                logger.warning(f"API call failed (attempt {attempt + 1}), retrying in {delay}s: {str(e)}")
                await asyncio.sleep(delay)
        
        # All retries exhausted
        raise last_exception
    
    def _calculate_retry_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate retry delay with exponential backoff and jitter"""
        delay = config.base_delay * (config.exponential_base ** attempt)
        delay = min(delay, config.max_delay)
        
        if config.jitter:
            # Add random jitter (±25%)
            jitter = delay * 0.25 * (2 * random.random() - 1)
            delay += jitter
        
        return max(0.1, delay)  # Minimum 100ms delay
    
    def _update_success_metrics(self, metrics_key: str, response_time: float):
        """Update success metrics"""
        metrics = self.health_metrics[metrics_key]
        metrics.success_count += 1
        metrics.last_success = datetime.utcnow()
        
        # Update rolling average response time
        if metrics.avg_response_time == 0:
            metrics.avg_response_time = response_time
        else:
            # Exponential moving average (alpha = 0.1)
            metrics.avg_response_time = 0.9 * metrics.avg_response_time + 0.1 * response_time
        
        # Update uptime percentage
        total_requests = metrics.success_count + metrics.failure_count
        metrics.uptime_percentage = (metrics.success_count / total_requests) * 100
    
    def _update_failure_metrics(self, metrics_key: str, exception: Exception):
        """Update failure metrics"""
        metrics = self.health_metrics[metrics_key]
        metrics.failure_count += 1
        metrics.last_failure = datetime.utcnow()
        
        # Update uptime percentage
        total_requests = metrics.success_count + metrics.failure_count
        metrics.uptime_percentage = (metrics.success_count / total_requests) * 100
        
        logger.error(f"API failure recorded for {metrics_key}: {str(exception)}")
    
    async def setup_webhook_reliability(
        self,
        webhook_url: str,
        integration_type: str,
        reliability_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Set up webhook reliability with replay mechanism and failure handling.
        Ensures webhook delivery reliability for critical business events.
        """
        try:
            # Configure webhook retry policy
            webhook_retry_config = RetryConfig(
                max_attempts=reliability_config.get("max_retries", 5),
                base_delay=reliability_config.get("base_delay", 2.0),
                max_delay=reliability_config.get("max_delay", 300.0),
                exponential_base=2.0,
                jitter=True
            )
            
            # Set up webhook circuit breaker
            webhook_circuit_config = CircuitBreakerConfig(
                failure_threshold=reliability_config.get("failure_threshold", 3),
                timeout=reliability_config.get("timeout", 120),
                failure_rate_threshold=0.5
            )
            
            # Configure dead letter queue for failed webhooks
            dlq_config = await self._setup_webhook_dlq(
                webhook_url, integration_type, reliability_config
            )
            
            # Set up webhook monitoring
            monitoring_config = await self._setup_webhook_monitoring(
                webhook_url, integration_type
            )
            
            # Configure webhook signature validation
            signature_config = await self._setup_webhook_signatures(
                integration_type, reliability_config
            )
            
            webhook_reliability = {
                "webhook_url": webhook_url,
                "retry_config": webhook_retry_config.__dict__,
                "circuit_breaker_config": webhook_circuit_config.__dict__,
                "dead_letter_queue": dlq_config,
                "monitoring": monitoring_config,
                "signature_validation": signature_config,
                "reliability_target": "99.5%",
                "setup_complete": True
            }
            
            return {
                "success": True,
                "webhook_reliability": webhook_reliability,
                "reliability_features": [
                    "exponential_backoff_retry",
                    "circuit_breaker_protection", 
                    "dead_letter_queue",
                    "signature_validation",
                    "real_time_monitoring"
                ],
                "target_reliability": "99.5%"
            }
            
        except Exception as e:
            logger.error(f"Failed to setup webhook reliability: {str(e)}")
            raise Exception(f"Webhook reliability setup failed: {str(e)}")
    
    async def get_integration_health_report(
        self, integration_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive health report for API integrations.
        Provides insights into reliability, performance, and optimization opportunities.
        """
        try:
            health_report = {
                "report_timestamp": datetime.utcnow().isoformat(),
                "overall_health": {},
                "integration_details": {},
                "recommendations": [],
                "alerts": []
            }
            
            # Filter metrics by integration type if specified
            filtered_metrics = self.health_metrics
            if integration_type:
                filtered_metrics = {
                    k: v for k, v in self.health_metrics.items() 
                    if k.startswith(f"{integration_type}:")
                }
            
            # Calculate overall health
            if filtered_metrics:
                total_success = sum(m.success_count for m in filtered_metrics.values())
                total_requests = sum(m.success_count + m.failure_count for m in filtered_metrics.values())
                overall_uptime = (total_success / total_requests * 100) if total_requests > 0 else 100
                
                avg_response_time = sum(m.avg_response_time for m in filtered_metrics.values()) / len(filtered_metrics)
                
                health_report["overall_health"] = {
                    "uptime_percentage": round(overall_uptime, 2),
                    "total_requests": total_requests,
                    "successful_requests": total_success,
                    "failed_requests": total_requests - total_success,
                    "avg_response_time": round(avg_response_time, 3),
                    "health_status": "excellent" if overall_uptime >= 99 else "good" if overall_uptime >= 95 else "needs_attention"
                }
            
            # Generate detailed integration reports
            for key, metrics in filtered_metrics.items():
                integration_name, api_name = key.split(":", 1)
                
                circuit_breaker = self.circuit_breakers.get(key)
                rate_limiter = self.rate_limiters.get(key)
                
                health_report["integration_details"][key] = {
                    "integration_type": integration_name,
                    "api_name": api_name,
                    "metrics": {
                        "uptime_percentage": round(metrics.uptime_percentage, 2),
                        "success_count": metrics.success_count,
                        "failure_count": metrics.failure_count,
                        "avg_response_time": round(metrics.avg_response_time, 3),
                        "rate_limit_hits": metrics.rate_limit_hits,
                        "circuit_breaker_trips": metrics.circuit_breaker_trips,
                        "last_success": metrics.last_success.isoformat() if metrics.last_success else None,
                        "last_failure": metrics.last_failure.isoformat() if metrics.last_failure else None
                    },
                    "circuit_breaker_state": circuit_breaker.state.value if circuit_breaker else "unknown",
                    "rate_limit_status": "healthy" if rate_limiter and rate_limiter.tokens["second"] > 0 else "limited"
                }
                
                # Generate recommendations
                if metrics.uptime_percentage < 95:
                    health_report["recommendations"].append({
                        "integration": key,
                        "type": "reliability",
                        "message": f"Uptime below 95% ({metrics.uptime_percentage:.1f}%). Consider adjusting circuit breaker or retry policies.",
                        "priority": "high"
                    })
                
                if metrics.avg_response_time > 5.0:
                    health_report["recommendations"].append({
                        "integration": key,
                        "type": "performance",
                        "message": f"High average response time ({metrics.avg_response_time:.2f}s). Consider rate limiting or caching.",
                        "priority": "medium"
                    })
                
                # Generate alerts for critical issues
                if circuit_breaker and circuit_breaker.state == CircuitState.OPEN:
                    health_report["alerts"].append({
                        "integration": key,
                        "type": "circuit_breaker_open",
                        "message": f"Circuit breaker is OPEN. Service may be down.",
                        "severity": "critical",
                        "timestamp": datetime.utcnow().isoformat()
                    })
            
            return health_report
            
        except Exception as e:
            logger.error(f"Failed to generate health report: {str(e)}")
            raise Exception(f"Health report generation failed: {str(e)}")


# Singleton instance for global use
api_reliability_service = ApiReliabilityService()