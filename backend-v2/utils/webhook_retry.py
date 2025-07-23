"""
Webhook retry and error recovery utilities.
Provides comprehensive error handling and retry mechanisms for webhook processing.
"""

import asyncio
import logging
import time
from typing import Callable, Any, Optional, Dict, List
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json

logger = logging.getLogger(__name__)


class RetryStrategy(Enum):
    """Different retry strategies for webhook processing"""
    FIXED_DELAY = "fixed_delay"
    EXPONENTIAL_BACKOFF = "exponential_backoff" 
    LINEAR_BACKOFF = "linear_backoff"


@dataclass
class RetryConfig:
    """Configuration for webhook retry behavior"""
    max_attempts: int = 3
    initial_delay: float = 1.0  # seconds
    max_delay: float = 60.0  # seconds
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    backoff_multiplier: float = 2.0
    jitter: bool = True  # Add random jitter to prevent thundering herd
    

@dataclass
class RetryResult:
    """Result of retry attempts"""
    success: bool
    final_result: Any = None
    attempts_made: int = 0
    total_duration: float = 0.0
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class WebhookRetryManager:
    """Manages retry logic for webhook processing with multiple strategies"""
    
    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()
        
    async def execute_with_retry(
        self,
        func: Callable,
        *args,
        operation_name: str = "webhook_operation",
        **kwargs
    ) -> RetryResult:
        """
        Execute a function with retry logic according to configured strategy.
        
        Args:
            func: The function to execute (can be sync or async)
            *args: Arguments to pass to the function
            operation_name: Name for logging purposes
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            RetryResult with success status and attempt details
        """
        start_time = time.time()
        result = RetryResult()
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                logger.info(f"Attempting {operation_name} (attempt {attempt}/{self.config.max_attempts})")
                
                # Execute function (handle both sync and async)
                if asyncio.iscoroutinefunction(func):
                    final_result = await func(*args, **kwargs)
                else:
                    final_result = func(*args, **kwargs)
                
                # Success - return immediately
                result.success = True
                result.final_result = final_result
                result.attempts_made = attempt
                result.total_duration = time.time() - start_time
                
                logger.info(f"{operation_name} succeeded on attempt {attempt}")
                return result
                
            except Exception as e:
                error_msg = f"Attempt {attempt} failed: {str(e)}"
                result.errors.append(error_msg)
                logger.warning(error_msg)
                
                # If this was the last attempt, don't wait
                if attempt >= self.config.max_attempts:
                    break
                
                # Calculate delay for next attempt
                delay = self._calculate_delay(attempt)
                logger.info(f"Waiting {delay:.2f} seconds before retry...")
                
                await asyncio.sleep(delay)
        
        # All attempts failed
        result.success = False
        result.attempts_made = self.config.max_attempts
        result.total_duration = time.time() - start_time
        
        logger.error(f"{operation_name} failed after {self.config.max_attempts} attempts")
        return result
    
    def _calculate_delay(self, attempt_number: int) -> float:
        """Calculate delay before next retry attempt"""
        
        if self.config.strategy == RetryStrategy.FIXED_DELAY:
            delay = self.config.initial_delay
            
        elif self.config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = self.config.initial_delay * (self.config.backoff_multiplier ** (attempt_number - 1))
            
        elif self.config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.config.initial_delay * attempt_number
            
        else:
            delay = self.config.initial_delay
        
        # Apply maximum delay limit
        delay = min(delay, self.config.max_delay)
        
        # Add jitter to prevent thundering herd
        if self.config.jitter:
            import random
            jitter = random.uniform(0.1, 0.3) * delay
            delay += jitter
        
        return delay


class CircuitBreaker:
    """Circuit breaker pattern for webhook endpoints to prevent cascading failures"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: Exception = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function through circuit breaker"""
        
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker moving to HALF_OPEN state")
            else:
                raise Exception("Circuit breaker is OPEN - operation not allowed")
        
        try:
            # Execute the function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Success - reset failure count
            self._on_success()
            return result
            
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True
            
        return time.time() - self.last_failure_time >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful operation"""
        self.failure_count = 0
        self.state = "CLOSED"
        logger.debug("Circuit breaker reset to CLOSED state")
    
    def _on_failure(self):
        """Handle failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


class WebhookErrorRecovery:
    """Comprehensive error recovery system for webhooks"""
    
    def __init__(self):
        self.retry_manager = WebhookRetryManager()
        self.circuit_breakers = {}  # Per-provider circuit breakers
        
    def get_circuit_breaker(self, provider: str) -> CircuitBreaker:
        """Get or create circuit breaker for a provider"""
        if provider not in self.circuit_breakers:
            self.circuit_breakers[provider] = CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=60
            )
        return self.circuit_breakers[provider]
    
    async def process_webhook_with_recovery(
        self,
        provider: str,
        processing_func: Callable,
        *args,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Process webhook with comprehensive error recovery.
        
        Includes:
        - Circuit breaker protection
        - Automatic retries with backoff
        - Detailed error tracking
        - Performance monitoring
        """
        
        circuit_breaker = self.get_circuit_breaker(provider)
        
        try:
            # Wrap processing function with retry logic
            async def retry_wrapper():
                return await circuit_breaker.call(processing_func, *args, **kwargs)
            
            # Execute with retry
            retry_result = await self.retry_manager.execute_with_retry(
                retry_wrapper,
                operation_name=f"{provider}_webhook_processing"
            )
            
            if retry_result.success:
                return {
                    "status": "success",
                    "result": retry_result.final_result,
                    "attempts": retry_result.attempts_made,
                    "duration_ms": int(retry_result.total_duration * 1000),
                    "recovery_used": retry_result.attempts_made > 1
                }
            else:
                return {
                    "status": "failed",
                    "error": "Max retry attempts exceeded",
                    "attempts": retry_result.attempts_made,
                    "duration_ms": int(retry_result.total_duration * 1000),
                    "errors": retry_result.errors
                }
                
        except Exception as e:
            logger.error(f"Webhook error recovery failed for {provider}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "provider": provider,
                "recovery_attempted": True
            }
    
    def get_recovery_stats(self) -> Dict[str, Any]:
        """Get statistics about recovery system performance"""
        return {
            "circuit_breakers": {
                provider: {
                    "state": cb.state,
                    "failure_count": cb.failure_count,
                    "last_failure": cb.last_failure_time
                }
                for provider, cb in self.circuit_breakers.items()
            },
            "retry_config": {
                "max_attempts": self.retry_manager.config.max_attempts,
                "strategy": self.retry_manager.config.strategy.value,
                "max_delay": self.retry_manager.config.max_delay
            }
        }


# Global error recovery instance
webhook_error_recovery = WebhookErrorRecovery()


# Utility functions for common error scenarios
async def safe_json_parse(payload: str, operation_name: str = "json_parsing") -> Dict[str, Any]:
    """Safely parse JSON with retry logic"""
    
    def parse_json():
        return json.loads(payload)
    
    recovery = WebhookErrorRecovery()
    recovery.retry_manager.config = RetryConfig(
        max_attempts=2,  # JSON parsing shouldn't need many retries
        initial_delay=0.1,
        strategy=RetryStrategy.FIXED_DELAY
    )
    
    result = await recovery.retry_manager.execute_with_retry(
        parse_json,
        operation_name=operation_name
    )
    
    if result.success:
        return result.final_result
    else:
        raise ValueError(f"Failed to parse JSON: {result.errors}")


async def safe_database_operation(db_func: Callable, *args, operation_name: str = "db_operation", **kwargs) -> Any:
    """Safely execute database operation with retry logic"""
    
    config = RetryConfig(
        max_attempts=3,
        initial_delay=0.5,
        strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
        backoff_multiplier=1.5
    )
    
    recovery = WebhookRetryManager(config)
    
    result = await recovery.execute_with_retry(
        db_func,
        *args,
        operation_name=operation_name,
        **kwargs
    )
    
    if result.success:
        return result.final_result
    else:
        raise Exception(f"Database operation failed: {result.errors}")