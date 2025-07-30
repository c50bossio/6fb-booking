"""
Enhanced Structured Logging with Error Correlation
Provides comprehensive logging with correlation IDs, context, and monitoring integration
"""

import json
import logging
import sys
import traceback
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Union
from contextvars import ContextVar
from functools import wraps
import asyncio
from pathlib import Path

# Context variables for request correlation
correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
user_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar('user_context', default=None)
business_context: ContextVar[Optional[Dict[str, Any]]] = ContextVar('business_context', default=None)

class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured JSON logs with correlation IDs
    """
    
    def __init__(self, include_context: bool = True, service_name: str = "bookedbarber-backend"):
        super().__init__()
        self.include_context = include_context
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        # Base log structure
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
            "version": getattr(record, 'version', '1.0.0'),
        }
        
        # Add correlation ID if available
        corr_id = correlation_id.get()
        if corr_id:
            log_entry["correlation_id"] = corr_id
        
        # Add user context if available
        if self.include_context:
            user_ctx = user_context.get()
            if user_ctx:
                log_entry["user"] = user_ctx
            
            business_ctx = business_context.get()
            if business_ctx:
                log_entry["business"] = business_ctx
        
        # Add request information if available
        if hasattr(record, 'request_id'):
            log_entry["request_id"] = record.request_id
        
        if hasattr(record, 'endpoint'):
            log_entry["endpoint"] = record.endpoint
        
        if hasattr(record, 'method'):
            log_entry["method"] = record.method
        
        if hasattr(record, 'status_code'):
            log_entry["status_code"] = record.status_code
        
        if hasattr(record, 'duration'):
            log_entry["duration_ms"] = record.duration
        
        # Add custom fields from extra
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'lineno', 'funcName', 'created', 
                          'msecs', 'relativeCreated', 'thread', 'threadName', 
                          'processName', 'process', 'stack_info', 'exc_info', 'exc_text']:
                extra_fields[key] = value
                
        if extra_fields:
            log_entry["extra"] = extra_fields
        
        # Add exception information
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add stack trace for errors
        if record.levelno >= logging.ERROR and not record.exc_info:
            log_entry["stack_trace"] = traceback.format_stack()
        
        # Add source location
        log_entry["source"] = {
            "file": record.pathname,
            "line": record.lineno,
            "function": record.funcName
        }
        
        return json.dumps(log_entry, default=str, ensure_ascii=False)

class SecurityAuditFormatter(StructuredFormatter):
    """
    Specialized formatter for security-related logs with data sanitization
    """
    
    SENSITIVE_FIELDS = {
        'password', 'token', 'secret', 'key', 'authorization', 'cookie',
        'ssn', 'credit_card', 'card_number', 'cvv', 'pin'
    }
    
    def format(self, record: logging.LogRecord) -> str:
        # Sanitize sensitive data before formatting
        self._sanitize_record(record)
        
        log_entry = super().format(record)
        parsed = json.loads(log_entry)
        
        # Add security-specific fields
        parsed["category"] = "security_audit"
        parsed["severity"] = self._determine_security_severity(record)
        
        return json.dumps(parsed, default=str, ensure_ascii=False)
    
    def _sanitize_record(self, record: logging.LogRecord):
        """Remove or mask sensitive information from log record"""
        for attr_name in dir(record):
            if not attr_name.startswith('_'):
                attr_value = getattr(record, attr_name)
                if isinstance(attr_value, (dict, str)):
                    setattr(record, attr_name, self._sanitize_value(attr_value))
    
    def _sanitize_value(self, value: Any) -> Any:
        """Sanitize sensitive values"""
        if isinstance(value, dict):
            return {
                k: "[REDACTED]" if any(sensitive in k.lower() for sensitive in self.SENSITIVE_FIELDS)
                else self._sanitize_value(v)
                for k, v in value.items()
            }
        elif isinstance(value, str):
            # Check if the string might contain sensitive data
            if any(sensitive in value.lower() for sensitive in self.SENSITIVE_FIELDS):
                return "[REDACTED]"
        return value
    
    def _determine_security_severity(self, record: logging.LogRecord) -> str:
        """Determine security severity based on log content"""
        message = record.getMessage().lower()
        
        if any(word in message for word in ['breach', 'attack', 'exploit', 'unauthorized']):
            return "critical"
        elif any(word in message for word in ['failed', 'denied', 'blocked', 'suspicious']):
            return "high"
        elif any(word in message for word in ['warning', 'unusual', 'anomaly']):
            return "medium"
        else:
            return "low"

class PerformanceLogger:
    """
    Logger specifically for performance monitoring with timing and resource usage
    """
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_request_performance(
        self, 
        endpoint: str, 
        method: str, 
        duration_ms: float,
        status_code: int,
        **kwargs
    ):
        """Log API request performance"""
        severity = self._get_performance_severity(duration_ms, status_code)
        
        self.logger.info(
            f"API request completed: {method} {endpoint}",
            extra={
                "category": "performance",
                "endpoint": endpoint,
                "method": method,
                "duration": duration_ms,
                "status_code": status_code,
                "severity": severity,
                **kwargs
            }
        )
    
    def log_database_performance(
        self, 
        query_type: str, 
        duration_ms: float, 
        rows_affected: Optional[int] = None,
        **kwargs
    ):
        """Log database query performance"""
        severity = self._get_db_performance_severity(duration_ms)
        
        self.logger.info(
            f"Database query completed: {query_type}",
            extra={
                "category": "database_performance",
                "query_type": query_type,
                "duration": duration_ms,
                "rows_affected": rows_affected,
                "severity": severity,
                **kwargs
            }
        )
    
    def log_external_api_performance(
        self, 
        service: str, 
        operation: str, 
        duration_ms: float,
        success: bool,
        **kwargs
    ):
        """Log external API call performance"""
        severity = self._get_external_api_severity(duration_ms, success)
        
        self.logger.info(
            f"External API call: {service}.{operation}",
            extra={
                "category": "external_api_performance",
                "service": service,
                "operation": operation,
                "duration": duration_ms,
                "success": success,
                "severity": severity,
                **kwargs
            }
        )
    
    def _get_performance_severity(self, duration_ms: float, status_code: int) -> str:
        """Determine performance severity for API requests"""
        if status_code >= 500:
            return "critical"
        elif duration_ms > 5000:  # 5+ seconds
            return "high"
        elif duration_ms > 2000:  # 2+ seconds
            return "medium"
        elif duration_ms > 1000:  # 1+ second
            return "low"
        else:
            return "info"
    
    def _get_db_performance_severity(self, duration_ms: float) -> str:
        """Determine performance severity for database queries"""
        if duration_ms > 10000:  # 10+ seconds
            return "critical"
        elif duration_ms > 5000:  # 5+ seconds
            return "high"
        elif duration_ms > 2000:  # 2+ seconds
            return "medium"
        elif duration_ms > 1000:  # 1+ second
            return "low"
        else:
            return "info"
    
    def _get_external_api_severity(self, duration_ms: float, success: bool) -> str:
        """Determine performance severity for external API calls"""
        if not success:
            return "high"
        elif duration_ms > 30000:  # 30+ seconds
            return "high"
        elif duration_ms > 15000:  # 15+ seconds
            return "medium"
        elif duration_ms > 10000:  # 10+ seconds
            return "low"
        else:
            return "info"

class BusinessEventLogger:
    """
    Logger for business events and metrics tracking
    """
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_booking_event(
        self, 
        event_type: str, 
        booking_id: str,
        client_id: Optional[str] = None,
        barber_id: Optional[str] = None,
        **kwargs
    ):
        """Log booking-related business events"""
        self.logger.info(
            f"Booking event: {event_type}",
            extra={
                "category": "business_event",
                "event_type": event_type,
                "booking_id": booking_id,
                "client_id": client_id,
                "barber_id": barber_id,
                "business_flow": "booking",
                **kwargs
            }
        )
    
    def log_payment_event(
        self, 
        event_type: str, 
        payment_id: str,
        amount: float,
        currency: str = "USD",
        status: str = "pending",
        **kwargs
    ):
        """Log payment-related business events"""
        self.logger.info(
            f"Payment event: {event_type}",
            extra={
                "category": "business_event",
                "event_type": event_type,
                "payment_id": payment_id,
                "amount": amount,
                "currency": currency,
                "status": status,
                "business_flow": "payment",
                **kwargs
            }
        )
    
    def log_user_event(
        self, 
        event_type: str, 
        user_id: str,
        user_role: str,
        **kwargs
    ):
        """Log user-related business events"""
        self.logger.info(
            f"User event: {event_type}",
            extra={
                "category": "business_event",
                "event_type": event_type,
                "user_id": user_id,
                "user_role": user_role,
                "business_flow": "user_management",
                **kwargs
            }
        )

class LoggerFactory:
    """
    Factory class for creating configured loggers with different purposes
    """
    
    _loggers: Dict[str, logging.Logger] = {}
    _configured = False
    
    @classmethod
    def configure_logging(
        cls,
        log_level: str = "INFO",
        log_file: Optional[str] = None,
        enable_console: bool = True,
        service_name: str = "bookedbarber-backend"
    ):
        """Configure global logging settings"""
        if cls._configured:
            return
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, log_level.upper()))
        
        # Remove existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Console handler with structured formatting
        if enable_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(StructuredFormatter(service_name=service_name))
            root_logger.addHandler(console_handler)
        
        # File handler if specified
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(StructuredFormatter(service_name=service_name))
            root_logger.addHandler(file_handler)
        
        cls._configured = True
    
    @classmethod
    def get_logger(cls, name: str, logger_type: str = "standard") -> logging.Logger:
        """Get or create a logger with specified configuration"""
        if name in cls._loggers:
            return cls._loggers[name]
        
        logger = logging.getLogger(name)
        
        # Configure based on logger type
        if logger_type == "security":
            # Add security-specific handler
            security_handler = logging.StreamHandler(sys.stdout)
            security_handler.setFormatter(SecurityAuditFormatter())
            logger.addHandler(security_handler)
        
        cls._loggers[name] = logger
        return logger
    
    @classmethod
    def get_performance_logger(cls, name: str) -> PerformanceLogger:
        """Get a performance logger instance"""
        base_logger = cls.get_logger(f"{name}.performance")
        return PerformanceLogger(base_logger)
    
    @classmethod
    def get_business_logger(cls, name: str) -> BusinessEventLogger:
        """Get a business event logger instance"""
        base_logger = cls.get_logger(f"{name}.business")
        return BusinessEventLogger(base_logger)
    
    @classmethod
    def get_security_logger(cls, name: str) -> logging.Logger:
        """Get a security audit logger instance"""
        return cls.get_logger(f"{name}.security", logger_type="security")

# Context managers for correlation and context
class LoggingContext:
    """Context manager for setting logging context"""
    
    def __init__(
        self,
        correlation_id_value: Optional[str] = None,
        user_context_value: Optional[Dict[str, Any]] = None,
        business_context_value: Optional[Dict[str, Any]] = None
    ):
        self.correlation_id_value = correlation_id_value or str(uuid.uuid4())
        self.user_context_value = user_context_value
        self.business_context_value = business_context_value
        self.correlation_token = None
        self.user_token = None
        self.business_token = None
    
    def __enter__(self):
        self.correlation_token = correlation_id.set(self.correlation_id_value)
        if self.user_context_value:
            self.user_token = user_context.set(self.user_context_value)
        if self.business_context_value:
            self.business_token = business_context.set(self.business_context_value)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.correlation_token:
            correlation_id.reset(self.correlation_token)
        if self.user_token:
            user_context.reset(self.user_token)
        if self.business_token:
            business_context.reset(self.business_token)

# Decorators for automatic logging
def log_function_call(
    logger: Optional[logging.Logger] = None,
    level: int = logging.INFO,
    include_args: bool = False,
    include_result: bool = False
):
    """Decorator to automatically log function calls"""
    def decorator(func):
        nonlocal logger
        if logger is None:
            logger = LoggerFactory.get_logger(func.__module__)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            
            log_data = {
                "function": func.__name__,
                "module": func.__module__
            }
            
            if include_args:
                log_data.update({
                    "args": str(args) if args else None,
                    "kwargs": kwargs if kwargs else None
                })
            
            logger.log(level, f"Function call started: {func.__name__}", extra=log_data)
            
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                success_data = {
                    **log_data,
                    "duration": duration,
                    "status": "success"
                }
                
                if include_result:
                    success_data["result"] = str(result)[:1000]  # Limit result size
                
                logger.log(level, f"Function call completed: {func.__name__}", extra=success_data)
                return result
                
            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                error_data = {
                    **log_data,
                    "duration": duration,
                    "status": "error",
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                }
                
                logger.error(f"Function call failed: {func.__name__}", extra=error_data, exc_info=True)
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            
            log_data = {
                "function": func.__name__,
                "module": func.__module__
            }
            
            if include_args:
                log_data.update({
                    "args": str(args) if args else None,
                    "kwargs": kwargs if kwargs else None
                })
            
            logger.log(level, f"Function call started: {func.__name__}", extra=log_data)
            
            try:
                result = func(*args, **kwargs)
                
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                success_data = {
                    **log_data,
                    "duration": duration,
                    "status": "success"
                }
                
                if include_result:
                    success_data["result"] = str(result)[:1000]  # Limit result size
                
                logger.log(level, f"Function call completed: {func.__name__}", extra=success_data)
                return result
                
            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                error_data = {
                    **log_data,
                    "duration": duration,
                    "status": "error",
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                }
                
                logger.error(f"Function call failed: {func.__name__}", extra=error_data, exc_info=True)
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

# Convenience functions
def get_logger(name: str) -> logging.Logger:
    """Get a standard logger"""
    return LoggerFactory.get_logger(name)

def get_performance_logger(name: str) -> PerformanceLogger:
    """Get a performance logger"""
    return LoggerFactory.get_performance_logger(name)

def get_business_logger(name: str) -> BusinessEventLogger:
    """Get a business event logger"""
    return LoggerFactory.get_business_logger(name)

def get_security_logger(name: str) -> logging.Logger:
    """Get a security logger"""
    return LoggerFactory.get_security_logger(name)

def set_user_context(user_id: str, email: Optional[str] = None, role: Optional[str] = None):
    """Set user context for logging"""
    context = {"id": user_id}
    if email:
        context["email"] = email
    if role:
        context["role"] = role
    user_context.set(context)

def set_business_context(flow: str, **kwargs):
    """Set business context for logging"""
    context = {"flow": flow, **kwargs}
    business_context.set(context)

def clear_context():
    """Clear all logging context"""
    correlation_id.set(None)
    user_context.set(None) 
    business_context.set(None)

# Initialize logging on import
LoggerFactory.configure_logging()