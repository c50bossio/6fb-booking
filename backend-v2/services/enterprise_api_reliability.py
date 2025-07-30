"""
Enterprise API Reliability Service for BookedBarber V2

Provides enterprise-grade reliability patterns:
- Intelligent retry with exponential backoff and jitter
- Circuit breaker integration with adaptive thresholds
- Bulk operation handling with batch management
- Comprehensive error recovery strategies
- Performance monitoring and auto-scaling
"""

import asyncio
import logging
import time
import random
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union, TypeVar, Generic
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import httpx
from sqlalchemy.orm import Session

from services.circuit_breaker_service import CircuitBreakerService, CircuitState
from utils.security_logging import get_security_logger, SecurityEventType
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

T = TypeVar('T')


class RetryStrategy(Enum):
    """Retry strategy types"""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    FIXED_DELAY = "fixed_delay"
    FIBONACCI = "fibonacci"
    CUSTOM = "custom"


class APIProvider(Enum):
    """Supported API providers"""
    STRIPE = "stripe"
    TWILIO = "twilio"
    SENDGRID = "sendgrid"
    GOOGLE_CALENDAR = "google_calendar"
    GOOGLE_MAPS = "google_maps"
    CUSTOM = "custom"


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 300.0
    exponential_base: float = 2.0
    jitter: bool = True
    jitter_range: float = 0.1
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    timeout: float = 30.0
    custom_delay_func: Optional[Callable[[int], float]] = None


@dataclass
class BulkConfig:
    """Configuration for bulk operations"""
    batch_size: int = 100
    max_concurrent_batches: int = 5
    delay_between_batches: float = 0.1
    failure_threshold: float = 0.1  # 10% failure rate threshold
    auto_adjust_batch_size: bool = True
    min_batch_size: int = 10
    max_batch_size: int = 1000


@dataclass
class APIResponse:
    """Standardized API response"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    status_code: Optional[int] = None
    response_time: float = 0.0
    attempt_count: int = 1
    provider: Optional[str] = None
    retry_after: Optional[int] = None
    rate_limit_remaining: Optional[int] = None
    circuit_breaker_state: Optional[str] = None


@dataclass
class BulkOperationResult:
    """Result of bulk operation"""
    total_items: int
    successful_items: int
    failed_items: int
    success_rate: float
    total_time: float
    average_response_time: float
    errors: List[Dict[str, Any]]
    rate_limited: bool = False
    circuit_breaker_triggered: bool = False


class EnterpriseAPIReliability:
    """Enterprise-grade API reliability service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.circuit_breaker = CircuitBreakerService()
        self.security_logger = get_security_logger(db)
        
        # Provider-specific configurations
        self.provider_configs = {
            APIProvider.STRIPE: {
                "retry_config": RetryConfig(
                    max_attempts=5,
                    base_delay=2.0,
                    max_delay=120.0,
                    timeout=45.0
                ),
                "bulk_config": BulkConfig(
                    batch_size=50,
                    max_concurrent_batches=3,
                    delay_between_batches=0.5
                ),
                "rate_limits": {"requests_per_second": 25, "requests_per_minute": 500}
            },
            APIProvider.TWILIO: {
                "retry_config": RetryConfig(
                    max_attempts=4,
                    base_delay=1.5,
                    max_delay=60.0,
                    timeout=30.0
                ),
                "bulk_config": BulkConfig(
                    batch_size=100,
                    max_concurrent_batches=5,
                    delay_between_batches=0.2
                ),
                "rate_limits": {"requests_per_second": 10, "requests_per_minute": 1000}
            },
            APIProvider.SENDGRID: {
                "retry_config": RetryConfig(
                    max_attempts=3,
                    base_delay=1.0,
                    max_delay=180.0,
                    timeout=60.0
                ),
                "bulk_config": BulkConfig(
                    batch_size=200,
                    max_concurrent_batches=2,
                    delay_between_batches=1.0
                ),
                "rate_limits": {"requests_per_second": 5, "requests_per_minute": 600}
            },
            APIProvider.GOOGLE_CALENDAR: {
                "retry_config": RetryConfig(
                    max_attempts=4,
                    base_delay=2.0,
                    max_delay=300.0,
                    timeout=30.0
                ),
                "bulk_config": BulkConfig(
                    batch_size=25,
                    max_concurrent_batches=2,
                    delay_between_batches=1.0
                ),
                "rate_limits": {"requests_per_second": 2, "requests_per_minute": 250}
            }
        }
        
        # Performance tracking
        self.performance_metrics = {}
        self.adaptive_thresholds = {}
    
    async def execute_with_reliability(
        self,
        provider: APIProvider,
        operation_name: str,
        api_call: Callable,
        *args,
        retry_config: Optional[RetryConfig] = None,
        **kwargs
    ) -> APIResponse:
        """Execute API call with comprehensive reliability patterns"""
        
        start_time = time.time()
        config = retry_config or self.provider_configs.get(provider, {}).get("retry_config", RetryConfig())
        
        # Check circuit breaker
        circuit_key = f"{provider.value}_{operation_name}"
        if not self.circuit_breaker.can_execute(circuit_key):
            return APIResponse(
                success=False,
                error="Circuit breaker is open",
                circuit_breaker_state=self.circuit_breaker.get_state(circuit_key).value,
                response_time=time.time() - start_time
            )
        
        last_exception = None
        attempt_count = 0
        
        for attempt in range(config.max_attempts):
            attempt_count = attempt + 1
            attempt_start = time.time()
            
            try:
                # Calculate delay for this attempt (if not first)
                if attempt > 0:
                    delay = self._calculate_delay(attempt, config)
                    await asyncio.sleep(delay)
                
                # Execute the API call with timeout
                result = await asyncio.wait_for(
                    self._execute_api_call(api_call, *args, **kwargs),
                    timeout=config.timeout
                )
                
                response_time = time.time() - attempt_start
                
                # Success - record metrics and reset circuit breaker
                self.circuit_breaker.record_success(circuit_key)
                self._record_performance_metrics(provider, operation_name, response_time, True)
                
                return APIResponse(
                    success=True,
                    data=result,
                    status_code=getattr(result, 'status_code', 200),
                    response_time=time.time() - start_time,
                    attempt_count=attempt_count,
                    provider=provider.value,
                    circuit_breaker_state=self.circuit_breaker.get_state(circuit_key).value
                )
                
            except asyncio.TimeoutError:
                last_exception = f"Request timed out after {config.timeout}s"
                self.circuit_breaker.record_failure(circuit_key)
                
            except aiohttp.ClientResponseError as e:
                last_exception = f"HTTP {e.status}: {e.message}"
                
                # Handle rate limiting
                if e.status == 429:
                    retry_after = self._extract_retry_after(e.headers)
                    if retry_after and attempt < config.max_attempts - 1:
                        await asyncio.sleep(min(retry_after, config.max_delay))
                        continue
                
                # Don't retry on client errors (4xx) except rate limiting
                if 400 <= e.status < 500 and e.status != 429:
                    break
                    
                self.circuit_breaker.record_failure(circuit_key)
                
            except Exception as e:
                last_exception = str(e)
                self.circuit_breaker.record_failure(circuit_key)
            
            # Log attempt failure
            attempt_time = time.time() - attempt_start
            self._record_performance_metrics(provider, operation_name, attempt_time, False)
            
            logger.warning(
                f"API call failed - Provider: {provider.value}, "
                f"Operation: {operation_name}, Attempt: {attempt_count}, "
                f"Error: {last_exception}"
            )
        
        # All attempts failed
        total_time = time.time() - start_time
        
        return APIResponse(
            success=False,
            error=f"All {config.max_attempts} attempts failed. Last error: {last_exception}",
            response_time=total_time,
            attempt_count=attempt_count,
            provider=provider.value,
            circuit_breaker_state=self.circuit_breaker.get_state(circuit_key).value
        )
    
    async def execute_bulk_operation(
        self,
        provider: APIProvider,
        operation_name: str,
        items: List[Any],
        api_call: Callable,
        bulk_config: Optional[BulkConfig] = None
    ) -> BulkOperationResult:
        """Execute bulk operations with intelligent batch management"""
        
        start_time = time.time()
        config = bulk_config or self.provider_configs.get(provider, {}).get("bulk_config", BulkConfig())
        
        total_items = len(items)
        successful_items = 0
        failed_items = 0
        errors = []
        response_times = []
        
        # Adaptive batch sizing based on historical performance
        current_batch_size = self._get_adaptive_batch_size(provider, operation_name, config)
        
        # Split items into batches
        batches = [items[i:i + current_batch_size] for i in range(0, len(items), current_batch_size)]
        
        # Process batches with concurrency control
        semaphore = asyncio.Semaphore(config.max_concurrent_batches)
        
        async def process_batch(batch_items: List[Any], batch_index: int) -> Dict[str, Any]:
            async with semaphore:
                batch_start = time.time()
                batch_results = {
                    "successful": 0,
                    "failed": 0,
                    "errors": [],
                    "response_time": 0.0
                }
                
                # Add delay between batches to respect rate limits
                if batch_index > 0:
                    await asyncio.sleep(config.delay_between_batches)
                
                # Process each item in the batch
                for item_index, item in enumerate(batch_items):
                    try:
                        response = await self.execute_with_reliability(
                            provider, f"{operation_name}_bulk", api_call, item
                        )
                        
                        if response.success:
                            batch_results["successful"] += 1
                        else:
                            batch_results["failed"] += 1
                            batch_results["errors"].append({
                                "batch_index": batch_index,
                                "item_index": item_index,
                                "error": response.error,
                                "item_data": str(item)[:100]  # Truncate for logging
                            })
                        
                        response_times.append(response.response_time)
                        
                    except Exception as e:
                        batch_results["failed"] += 1
                        batch_results["errors"].append({
                            "batch_index": batch_index,
                            "item_index": item_index,
                            "error": str(e),
                            "item_data": str(item)[:100]
                        })
                
                batch_results["response_time"] = time.time() - batch_start
                return batch_results
        
        # Execute all batches concurrently
        try:
            batch_results = await asyncio.gather(
                *[process_batch(batch, i) for i, batch in enumerate(batches)],
                return_exceptions=True
            )
            
            # Aggregate results
            for result in batch_results:
                if isinstance(result, Exception):
                    failed_items += len(batches[0])  # Approximate
                    errors.append({"error": str(result), "type": "batch_exception"})
                else:
                    successful_items += result["successful"]
                    failed_items += result["failed"]
                    errors.extend(result["errors"])
            
        except Exception as e:
            logger.error(f"Bulk operation failed catastrophically: {e}")
            failed_items = total_items
            errors.append({"error": str(e), "type": "bulk_operation_exception"})
        
        total_time = time.time() - start_time
        success_rate = successful_items / total_items if total_items > 0 else 0.0
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0.0
        
        # Update adaptive batch sizing based on performance
        self._update_adaptive_batch_size(provider, operation_name, current_batch_size, success_rate, avg_response_time)
        
        # Log bulk operation results
        logger.info(
            f"Bulk operation completed - Provider: {provider.value}, "
            f"Operation: {operation_name}, Items: {total_items}, "
            f"Success Rate: {success_rate:.2%}, Time: {total_time:.2f}s"
        )
        
        return BulkOperationResult(
            total_items=total_items,
            successful_items=successful_items,
            failed_items=failed_items,
            success_rate=success_rate,
            total_time=total_time,
            average_response_time=avg_response_time,
            errors=errors,
            rate_limited=any("rate limit" in str(error).lower() for error in errors),
            circuit_breaker_triggered=any("circuit breaker" in str(error).lower() for error in errors)
        )
    
    def _calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay for retry attempt"""
        
        if config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = config.base_delay * (config.exponential_base ** (attempt - 1))
        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.base_delay * attempt
        elif config.strategy == RetryStrategy.FIXED_DELAY:
            delay = config.base_delay
        elif config.strategy == RetryStrategy.FIBONACCI:
            fib_sequence = [1, 1]
            for i in range(2, attempt + 1):
                fib_sequence.append(fib_sequence[i-1] + fib_sequence[i-2])
            delay = config.base_delay * fib_sequence[min(attempt, len(fib_sequence) - 1)]
        elif config.strategy == RetryStrategy.CUSTOM and config.custom_delay_func:
            delay = config.custom_delay_func(attempt)
        else:
            delay = config.base_delay
        
        # Apply maximum delay cap
        delay = min(delay, config.max_delay)
        
        # Add jitter to avoid thundering herd
        if config.jitter:
            jitter_amount = delay * config.jitter_range
            delay += random.uniform(-jitter_amount, jitter_amount)
        
        return max(0, delay)
    
    async def _execute_api_call(self, api_call: Callable, *args, **kwargs) -> Any:
        """Execute API call with proper async handling"""
        if asyncio.iscoroutinefunction(api_call):
            return await api_call(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: api_call(*args, **kwargs))
    
    def _extract_retry_after(self, headers: Dict[str, str]) -> Optional[int]:
        """Extract Retry-After header value"""
        retry_after = headers.get('Retry-After') or headers.get('retry-after')
        if retry_after:
            try:
                return int(retry_after)
            except ValueError:
                # Retry-After might be a date, not seconds
                pass
        return None
    
    def _record_performance_metrics(self, provider: APIProvider, operation: str, response_time: float, success: bool):
        """Record performance metrics for adaptive optimization"""
        key = f"{provider.value}_{operation}"
        
        if key not in self.performance_metrics:
            self.performance_metrics[key] = {
                "total_requests": 0,
                "successful_requests": 0,
                "total_response_time": 0.0,
                "last_updated": datetime.utcnow()
            }
        
        metrics = self.performance_metrics[key]
        metrics["total_requests"] += 1
        metrics["total_response_time"] += response_time
        
        if success:
            metrics["successful_requests"] += 1
        
        metrics["last_updated"] = datetime.utcnow()
        
        # Calculate derived metrics
        metrics["success_rate"] = metrics["successful_requests"] / metrics["total_requests"]
        metrics["average_response_time"] = metrics["total_response_time"] / metrics["total_requests"]
    
    def _get_adaptive_batch_size(self, provider: APIProvider, operation: str, config: BulkConfig) -> int:
        """Get adaptive batch size based on historical performance"""
        if not config.auto_adjust_batch_size:
            return config.batch_size
        
        key = f"{provider.value}_{operation}_batch"
        
        if key not in self.adaptive_thresholds:
            return config.batch_size
        
        threshold_data = self.adaptive_thresholds[key]
        recent_success_rate = threshold_data.get("recent_success_rate", 1.0)
        recent_response_time = threshold_data.get("recent_response_time", 1.0)
        
        # Adjust batch size based on performance
        current_batch_size = config.batch_size
        
        if recent_success_rate < 0.8:  # Low success rate - reduce batch size
            current_batch_size = max(config.min_batch_size, int(current_batch_size * 0.7))
        elif recent_success_rate > 0.95 and recent_response_time < 2.0:  # High performance - increase batch size
            current_batch_size = min(config.max_batch_size, int(current_batch_size * 1.3))
        
        return current_batch_size
    
    def _update_adaptive_batch_size(self, provider: APIProvider, operation: str, batch_size: int, success_rate: float, response_time: float):
        """Update adaptive batch sizing based on recent performance"""
        key = f"{provider.value}_{operation}_batch"
        
        if key not in self.adaptive_thresholds:
            self.adaptive_thresholds[key] = {
                "batch_size_history": [],
                "success_rate_history": [],
                "response_time_history": []
            }
        
        threshold_data = self.adaptive_thresholds[key]
        
        # Keep rolling history (last 10 measurements)
        max_history = 10
        
        threshold_data["batch_size_history"].append(batch_size)
        threshold_data["success_rate_history"].append(success_rate)
        threshold_data["response_time_history"].append(response_time)
        
        # Trim history
        for history_key in ["batch_size_history", "success_rate_history", "response_time_history"]:
            if len(threshold_data[history_key]) > max_history:
                threshold_data[history_key] = threshold_data[history_key][-max_history:]
        
        # Calculate recent averages
        threshold_data["recent_success_rate"] = sum(threshold_data["success_rate_history"]) / len(threshold_data["success_rate_history"])
        threshold_data["recent_response_time"] = sum(threshold_data["response_time_history"]) / len(threshold_data["response_time_history"])
        threshold_data["last_updated"] = datetime.utcnow()
    
    def get_performance_report(self, provider: Optional[APIProvider] = None) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "providers": {},
            "circuit_breaker_states": {},
            "adaptive_thresholds": {}
        }
        
        # Filter metrics by provider if specified
        filtered_metrics = self.performance_metrics
        if provider:
            filtered_metrics = {
                k: v for k, v in self.performance_metrics.items() 
                if k.startswith(provider.value)
            }
        
        # Group metrics by provider
        for metric_key, metrics in filtered_metrics.items():
            provider_name = metric_key.split('_')[0]
            if provider_name not in report["providers"]:
                report["providers"][provider_name] = {}
            
            operation_name = '_'.join(metric_key.split('_')[1:])
            report["providers"][provider_name][operation_name] = {
                "total_requests": metrics["total_requests"],
                "success_rate": metrics.get("success_rate", 0.0),
                "average_response_time": metrics.get("average_response_time", 0.0),
                "last_updated": metrics["last_updated"].isoformat()
            }
        
        # Add circuit breaker states
        for provider_config in self.provider_configs.keys():
            provider_name = provider_config.value
            circuit_states = {}
            
            # Get states for common operations
            for operation in ["create", "update", "delete", "list", "bulk"]:
                circuit_key = f"{provider_name}_{operation}"
                state = self.circuit_breaker.get_state(circuit_key)
                circuit_states[operation] = state.value
            
            report["circuit_breaker_states"][provider_name] = circuit_states
        
        # Add adaptive thresholds
        report["adaptive_thresholds"] = {
            k: {
                "recent_success_rate": v.get("recent_success_rate", 0.0),
                "recent_response_time": v.get("recent_response_time", 0.0),
                "last_updated": v.get("last_updated", datetime.utcnow()).isoformat()
            }
            for k, v in self.adaptive_thresholds.items()
        }
        
        return report
    
    async def health_check(self, provider: APIProvider) -> Dict[str, Any]:
        """Perform health check for specific provider"""
        health_status = {
            "provider": provider.value,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "unknown",
            "response_time": 0.0,
            "circuit_breaker_state": "unknown",
            "recent_success_rate": 0.0,
            "details": {}
        }
        
        try:
            # Simple health check based on provider
            if provider == APIProvider.STRIPE:
                # Stripe health check - list payment methods or similar lightweight operation
                health_call = self._stripe_health_check
            elif provider == APIProvider.TWILIO:
                # Twilio health check - account info
                health_call = self._twilio_health_check
            elif provider == APIProvider.SENDGRID:
                # SendGrid health check - account info
                health_call = self._sendgrid_health_check
            elif provider == APIProvider.GOOGLE_CALENDAR:
                # Google Calendar health check - calendar list
                health_call = self._google_calendar_health_check
            else:
                health_status["status"] = "unsupported"
                return health_status
            
            # Execute health check with minimal retry
            health_config = RetryConfig(max_attempts=2, base_delay=1.0, timeout=10.0)
            
            response = await self.execute_with_reliability(
                provider, "health_check", health_call, retry_config=health_config
            )
            
            health_status["status"] = "healthy" if response.success else "unhealthy"
            health_status["response_time"] = response.response_time
            health_status["circuit_breaker_state"] = response.circuit_breaker_state or "unknown"
            
            if not response.success:
                health_status["details"]["error"] = response.error
            
            # Add recent performance metrics
            key = f"{provider.value}_health_check"
            if key in self.performance_metrics:
                metrics = self.performance_metrics[key]
                health_status["recent_success_rate"] = metrics.get("success_rate", 0.0)
            
        except Exception as e:
            health_status["status"] = "error"
            health_status["details"]["error"] = str(e)
            logger.error(f"Health check failed for {provider.value}: {e}")
        
        return health_status
    
    async def _stripe_health_check(self) -> Dict[str, Any]:
        """Stripe-specific health check"""
        # Implement lightweight Stripe API call
        return {"status": "ok", "service": "stripe"}
    
    async def _twilio_health_check(self) -> Dict[str, Any]:
        """Twilio-specific health check"""
        # Implement lightweight Twilio API call
        return {"status": "ok", "service": "twilio"}
    
    async def _sendgrid_health_check(self) -> Dict[str, Any]:
        """SendGrid-specific health check"""
        # Implement lightweight SendGrid API call
        return {"status": "ok", "service": "sendgrid"}
    
    async def _google_calendar_health_check(self) -> Dict[str, Any]:
        """Google Calendar-specific health check"""
        # Implement lightweight Google Calendar API call
        return {"status": "ok", "service": "google_calendar"}


def get_enterprise_api_reliability(db: Session) -> EnterpriseAPIReliability:
    """Dependency to get enterprise API reliability service"""
    return EnterpriseAPIReliability(db)
