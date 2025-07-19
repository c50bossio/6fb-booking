"""
Production-Grade Error Handling for AI Agent Operations
Provides comprehensive exception handling, retry mechanisms, and circuit breakers
"""

import asyncio
import json
import logging
import time
import traceback
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union, Type
from pathlib import Path
import sqlite3
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    DATABASE = "database"
    API = "api"
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    BUSINESS_LOGIC = "business_logic"
    EXTERNAL_SERVICE = "external_service"
    RESOURCE = "resource"
    NETWORK = "network"


class RetryStrategy(Enum):
    NONE = "none"
    FIXED = "fixed"
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    RANDOM = "random"


@dataclass
class ErrorContext:
    """Complete context for error tracking and analysis"""
    error_id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    operation: str
    agent_id: Optional[str]
    client_id: Optional[str]
    error_message: str
    stack_trace: str
    request_data: Dict[str, Any]
    system_state: Dict[str, Any]
    retry_count: int = 0
    resolved: bool = False
    resolution_time: Optional[datetime] = None


@dataclass
class RetryConfig:
    """Configuration for retry mechanisms"""
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True
    

class CircuitBreakerState(Enum):
    CLOSED = "closed"    # Normal operation
    OPEN = "open"        # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker pattern"""
    failure_threshold: int = 5
    recovery_timeout: int = 60
    success_threshold: int = 3  # For half-open state


class AgentError(Exception):
    """Base exception for agent operations"""
    
    def __init__(self, message: str, category: ErrorCategory = ErrorCategory.BUSINESS_LOGIC,
                 severity: ErrorSeverity = ErrorSeverity.MEDIUM, 
                 context: Dict[str, Any] = None):
        super().__init__(message)
        self.category = category
        self.severity = severity
        self.context = context or {}


class DatabaseError(AgentError):
    """Database operation errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(message, category=ErrorCategory.DATABASE, **kwargs)


class APIError(AgentError):
    """API-related errors"""
    def __init__(self, message: str, status_code: int = None, **kwargs):
        super().__init__(message, category=ErrorCategory.API, **kwargs)
        self.status_code = status_code


class ValidationError(AgentError):
    """Data validation errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(message, category=ErrorCategory.VALIDATION, **kwargs)


class AuthenticationError(AgentError):
    """Authentication/authorization errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(message, category=ErrorCategory.AUTHENTICATION, 
                        severity=ErrorSeverity.HIGH, **kwargs)


class ExternalServiceError(AgentError):
    """External service integration errors"""
    def __init__(self, message: str, service_name: str = None, **kwargs):
        super().__init__(message, category=ErrorCategory.EXTERNAL_SERVICE, **kwargs)
        self.service_name = service_name


class CircuitBreaker:
    """Circuit breaker implementation for external service calls"""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.logger = logging.getLogger(f"circuit_breaker.{name}")
    
    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        if self.state == CircuitBreakerState.CLOSED:
            return True
        elif self.state == CircuitBreakerState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitBreakerState.HALF_OPEN
                self.success_count = 0
                self.logger.info(f"Circuit breaker {self.name} moving to HALF_OPEN")
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def record_success(self):
        """Record successful operation"""
        if self.state == CircuitBreakerState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                self.logger.info(f"Circuit breaker {self.name} recovered to CLOSED")
        elif self.state == CircuitBreakerState.CLOSED:
            self.failure_count = 0
    
    def record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state in [CircuitBreakerState.CLOSED, CircuitBreakerState.HALF_OPEN]:
            if self.failure_count >= self.config.failure_threshold:
                self.state = CircuitBreakerState.OPEN
                self.logger.warning(f"Circuit breaker {self.name} opened due to failures")
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.config.recovery_timeout


class ErrorTracker:
    """Centralized error tracking and analysis"""
    
    def __init__(self, db_path: str = "agent_errors.db"):
        self.db_path = db_path
        self._init_database()
        self.logger = logging.getLogger("error_tracker")
    
    def _init_database(self):
        """Initialize error tracking database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS error_logs (
                    error_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    category TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    agent_id TEXT,
                    client_id TEXT,
                    error_message TEXT NOT NULL,
                    stack_trace TEXT,
                    request_data TEXT,
                    system_state TEXT,
                    retry_count INTEGER DEFAULT 0,
                    resolved BOOLEAN DEFAULT 0,
                    resolution_time TEXT
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp ON error_logs(timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_severity ON error_logs(severity)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_category ON error_logs(category)
            """)
    
    def log_error(self, error_context: ErrorContext):
        """Log error to database and external systems"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO error_logs 
                    (error_id, timestamp, severity, category, operation, agent_id, 
                     client_id, error_message, stack_trace, request_data, system_state,
                     retry_count, resolved, resolution_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    error_context.error_id,
                    error_context.timestamp.isoformat(),
                    error_context.severity.value,
                    error_context.category.value,
                    error_context.operation,
                    error_context.agent_id,
                    error_context.client_id,
                    error_context.error_message,
                    error_context.stack_trace,
                    json.dumps(error_context.request_data),
                    json.dumps(error_context.system_state),
                    error_context.retry_count,
                    error_context.resolved,
                    error_context.resolution_time.isoformat() if error_context.resolution_time else None
                ))
            
            # Log to application logger based on severity
            log_level = {
                ErrorSeverity.LOW: logging.INFO,
                ErrorSeverity.MEDIUM: logging.WARNING,
                ErrorSeverity.HIGH: logging.ERROR,
                ErrorSeverity.CRITICAL: logging.CRITICAL
            }[error_context.severity]
            
            self.logger.log(
                log_level,
                f"[{error_context.error_id}] {error_context.operation}: {error_context.error_message}"
            )
            
        except Exception as e:
            self.logger.error(f"Failed to log error {error_context.error_id}: {e}")
    
    def get_error_patterns(self, hours: int = 24) -> Dict[str, Any]:
        """Analyze error patterns for monitoring"""
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            # Error frequency by category
            category_stats = dict(conn.execute("""
                SELECT category, COUNT(*) as count
                FROM error_logs 
                WHERE timestamp > ?
                GROUP BY category
                ORDER BY count DESC
            """, (cutoff,)).fetchall())
            
            # Error frequency by severity
            severity_stats = dict(conn.execute("""
                SELECT severity, COUNT(*) as count
                FROM error_logs 
                WHERE timestamp > ?
                GROUP BY severity
                ORDER BY count DESC
            """, (cutoff,)).fetchall())
            
            # Top failing operations
            operation_stats = dict(conn.execute("""
                SELECT operation, COUNT(*) as count
                FROM error_logs 
                WHERE timestamp > ?
                GROUP BY operation
                ORDER BY count DESC
                LIMIT 10
            """, (cutoff,)).fetchall())
            
            # Resolution rates
            total_errors = conn.execute("""
                SELECT COUNT(*) FROM error_logs WHERE timestamp > ?
            """, (cutoff,)).fetchone()[0]
            
            resolved_errors = conn.execute("""
                SELECT COUNT(*) FROM error_logs WHERE timestamp > ? AND resolved = 1
            """, (cutoff,)).fetchone()[0]
            
            resolution_rate = (resolved_errors / total_errors * 100) if total_errors > 0 else 0
        
        return {
            "time_period_hours": hours,
            "total_errors": total_errors,
            "resolution_rate_percent": round(resolution_rate, 2),
            "errors_by_category": category_stats,
            "errors_by_severity": severity_stats,
            "top_failing_operations": operation_stats
        }


class AgentErrorHandler:
    """Main error handling coordinator for agent operations"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.error_tracker = ErrorTracker()
        self.retry_configs: Dict[str, RetryConfig] = {}
        self.logger = logging.getLogger("agent_error_handler")
        
        # Load configuration
        if config_path:
            self._load_config(config_path)
        else:
            self._set_default_configs()
    
    def _load_config(self, config_path: str):
        """Load error handling configuration from file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Load circuit breaker configs
            for name, cb_config in config.get('circuit_breakers', {}).items():
                self.circuit_breakers[name] = CircuitBreaker(
                    name, CircuitBreakerConfig(**cb_config)
                )
            
            # Load retry configs
            for operation, retry_config in config.get('retry_configs', {}).items():
                self.retry_configs[operation] = RetryConfig(**retry_config)
                
        except Exception as e:
            self.logger.error(f"Failed to load config from {config_path}: {e}")
            self._set_default_configs()
    
    def _set_default_configs(self):
        """Set default error handling configurations"""
        # Default circuit breakers for external services
        self.circuit_breakers['database'] = CircuitBreaker(
            'database', CircuitBreakerConfig(failure_threshold=3, recovery_timeout=30)
        )
        self.circuit_breakers['openai_api'] = CircuitBreaker(
            'openai_api', CircuitBreakerConfig(failure_threshold=5, recovery_timeout=60)
        )
        self.circuit_breakers['email_service'] = CircuitBreaker(
            'email_service', CircuitBreakerConfig(failure_threshold=3, recovery_timeout=30)
        )
        
        # Default retry configs
        self.retry_configs['agent_conversation'] = RetryConfig(
            strategy=RetryStrategy.EXPONENTIAL, max_attempts=3, base_delay=1.0
        )
        self.retry_configs['database_operation'] = RetryConfig(
            strategy=RetryStrategy.EXPONENTIAL, max_attempts=5, base_delay=0.5, max_delay=30.0
        )
        self.retry_configs['external_api'] = RetryConfig(
            strategy=RetryStrategy.EXPONENTIAL, max_attempts=3, base_delay=2.0
        )
    
    def with_error_handling(self, 
                           operation_name: str,
                           circuit_breaker_name: Optional[str] = None,
                           retry_config_name: Optional[str] = None,
                           agent_id: Optional[str] = None,
                           client_id: Optional[str] = None):
        """Decorator for comprehensive error handling"""
        
        def decorator(func: Callable):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await self._execute_with_error_handling(
                    func, args, kwargs, operation_name, circuit_breaker_name,
                    retry_config_name, agent_id, client_id, is_async=True
                )
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                try:
                    # Try to get current event loop
                    loop = asyncio.get_running_loop()
                    # If we're in an event loop, create a task
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            asyncio.run,
                            self._execute_with_error_handling(
                                func, args, kwargs, operation_name, circuit_breaker_name,
                                retry_config_name, agent_id, client_id, is_async=False
                            )
                        )
                        return future.result()
                except RuntimeError:
                    # No event loop running, safe to use asyncio.run
                    return asyncio.run(self._execute_with_error_handling(
                        func, args, kwargs, operation_name, circuit_breaker_name,
                        retry_config_name, agent_id, client_id, is_async=False
                    ))
            
            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
        
        return decorator
    
    async def _execute_with_error_handling(self,
                                         func: Callable,
                                         args: tuple,
                                         kwargs: dict,
                                         operation_name: str,
                                         circuit_breaker_name: Optional[str],
                                         retry_config_name: Optional[str],
                                         agent_id: Optional[str],
                                         client_id: Optional[str],
                                         is_async: bool) -> Any:
        """Execute function with comprehensive error handling"""
        
        # Check circuit breaker
        circuit_breaker = None
        if circuit_breaker_name and circuit_breaker_name in self.circuit_breakers:
            circuit_breaker = self.circuit_breakers[circuit_breaker_name]
            if not circuit_breaker.can_execute():
                raise ExternalServiceError(
                    f"Circuit breaker {circuit_breaker_name} is open",
                    service_name=circuit_breaker_name,
                    severity=ErrorSeverity.HIGH
                )
        
        # Get retry configuration
        retry_config = self.retry_configs.get(
            retry_config_name or operation_name,
            RetryConfig()  # Default config
        )
        
        last_exception = None
        
        for attempt in range(retry_config.max_attempts):
            try:
                # Execute the function
                if is_async:
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                # Record success for circuit breaker
                if circuit_breaker:
                    circuit_breaker.record_success()
                
                return result
                
            except Exception as e:
                last_exception = e
                
                # Record failure for circuit breaker
                if circuit_breaker:
                    circuit_breaker.record_failure()
                
                # Determine error characteristics
                error_category, severity = self._classify_error(e)
                
                # Create error context
                error_context = ErrorContext(
                    error_id=f"{operation_name}_{int(time.time())}_{attempt}",
                    timestamp=datetime.now(),
                    severity=severity,
                    category=error_category,
                    operation=operation_name,
                    agent_id=agent_id,
                    client_id=client_id,
                    error_message=str(e),
                    stack_trace=traceback.format_exc(),
                    request_data={"args": str(args), "kwargs": str(kwargs)},
                    system_state=self._get_system_state(),
                    retry_count=attempt
                )
                
                # Log error
                self.error_tracker.log_error(error_context)
                
                # Check if should retry
                if attempt < retry_config.max_attempts - 1 and self._should_retry(e, retry_config):
                    delay = self._calculate_delay(retry_config, attempt)
                    self.logger.info(
                        f"Retrying {operation_name} in {delay:.2f}s (attempt {attempt + 1}/{retry_config.max_attempts})"
                    )
                    await asyncio.sleep(delay)
                    continue
                else:
                    # Final failure
                    error_context.retry_count = attempt + 1
                    self.error_tracker.log_error(error_context)
                    break
        
        # Re-raise the last exception
        if isinstance(last_exception, AgentError):
            raise last_exception
        else:
            # Wrap unknown exceptions
            category, severity = self._classify_error(last_exception)
            raise AgentError(
                f"Operation {operation_name} failed: {last_exception}",
                category=category,
                severity=severity,
                context={"original_error": str(last_exception)}
            )
    
    def _classify_error(self, error: Exception) -> tuple[ErrorCategory, ErrorSeverity]:
        """Classify error by category and severity"""
        if isinstance(error, AgentError):
            return error.category, error.severity
        
        error_str = str(error).lower()
        error_type = type(error).__name__.lower()
        
        # Database errors
        if any(term in error_str for term in ['database', 'sql', 'connection', 'sqlite']):
            return ErrorCategory.DATABASE, ErrorSeverity.HIGH
        
        # Network/API errors
        if any(term in error_str for term in ['connection', 'timeout', 'network', 'http']):
            return ErrorCategory.NETWORK, ErrorSeverity.MEDIUM
        
        # Validation errors
        if any(term in error_str for term in ['validation', 'invalid', 'missing', 'required']):
            return ErrorCategory.VALIDATION, ErrorSeverity.LOW
        
        # Authentication errors
        if any(term in error_str for term in ['auth', 'permission', 'unauthorized', 'forbidden']):
            return ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH
        
        # Resource errors
        if any(term in error_str for term in ['memory', 'disk', 'file', 'resource']):
            return ErrorCategory.RESOURCE, ErrorSeverity.MEDIUM
        
        # Default classification
        return ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM
    
    def _should_retry(self, error: Exception, config: RetryConfig) -> bool:
        """Determine if error should be retried"""
        if config.strategy == RetryStrategy.NONE:
            return False
        
        # Don't retry certain error types
        if isinstance(error, (ValidationError, AuthenticationError)):
            return False
        
        # Don't retry for critical severity
        if isinstance(error, AgentError) and error.severity == ErrorSeverity.CRITICAL:
            return False
        
        return True
    
    def _calculate_delay(self, config: RetryConfig, attempt: int) -> float:
        """Calculate delay for retry attempt"""
        if config.strategy == RetryStrategy.FIXED:
            delay = config.base_delay
        elif config.strategy == RetryStrategy.LINEAR:
            delay = config.base_delay * (attempt + 1)
        elif config.strategy == RetryStrategy.EXPONENTIAL:
            delay = config.base_delay * (config.backoff_multiplier ** attempt)
        elif config.strategy == RetryStrategy.RANDOM:
            delay = random.uniform(config.base_delay, config.max_delay)
        else:
            delay = config.base_delay
        
        # Apply maximum delay limit
        delay = min(delay, config.max_delay)
        
        # Add jitter if enabled
        if config.jitter:
            jitter = delay * 0.1 * random.random()
            delay += jitter
        
        return delay
    
    def _get_system_state(self) -> Dict[str, Any]:
        """Capture current system state for debugging"""
        try:
            import psutil
            return {
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            }
        except ImportError:
            return {
                "timestamp": datetime.now().isoformat(),
                "note": "psutil not available for system monitoring"
            }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of error handling system"""
        circuit_breaker_status = {}
        for name, cb in self.circuit_breakers.items():
            circuit_breaker_status[name] = {
                "state": cb.state.value,
                "failure_count": cb.failure_count,
                "success_count": cb.success_count
            }
        
        error_patterns = self.error_tracker.get_error_patterns(hours=1)
        
        return {
            "circuit_breakers": circuit_breaker_status,
            "error_patterns_last_hour": error_patterns,
            "retry_configs": {name: asdict(config) for name, config in self.retry_configs.items()}
        }


# Global error handler instance
error_handler = AgentErrorHandler()


# Convenience decorators
def with_retry(operation_name: str, max_attempts: int = 3):
    """Simple retry decorator"""
    return error_handler.with_error_handling(
        operation_name=operation_name,
        retry_config_name=operation_name
    )


def with_circuit_breaker(service_name: str):
    """Circuit breaker decorator"""
    return error_handler.with_error_handling(
        operation_name=f"{service_name}_operation",
        circuit_breaker_name=service_name
    )


def with_full_protection(operation_name: str, service_name: str):
    """Full error handling protection"""
    return error_handler.with_error_handling(
        operation_name=operation_name,
        circuit_breaker_name=service_name,
        retry_config_name=operation_name
    )