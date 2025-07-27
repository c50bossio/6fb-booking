"""
Enhanced Sentry Monitoring for Database and Background Jobs
==========================================================

This module provides comprehensive monitoring for:
- Database operations with performance tracking
- Celery task execution and errors
- Redis cache operations
- Business logic failures and performance
"""

import time
import logging
from typing import Any, Callable
from functools import wraps
from contextlib import contextmanager

import sentry_sdk
from sentry_sdk import start_transaction, start_span
from sqlalchemy.engine import Engine
from sqlalchemy.event import listens_for

logger = logging.getLogger(__name__)


class SentryService:
    """Sentry service for comprehensive monitoring."""
    
    def __init__(self):
        self.db_monitor = None
        self.celery_monitor = None
        self.redis_monitor = None
    
    def initialize(self):
        """Initialize all monitoring services."""
        self.db_monitor = DatabaseMonitor()
        self.celery_monitor = CeleryMonitor()
        self.redis_monitor = RedisMonitor()
        logger.info("Sentry monitoring services initialized")
    
    def get_health_status(self):
        """Get comprehensive health status."""
        return {
            "status": "healthy",
            "database_monitor": "active",
            "celery_monitor": "active", 
            "redis_monitor": "active"
        }


class DatabaseMonitor:
    """Monitor database operations with Sentry integration."""
    
    def __init__(self):
        self.slow_query_threshold = 1.0  # seconds
        self.very_slow_query_threshold = 5.0  # seconds
        
    def setup_database_monitoring(self, engine: Engine) -> None:
        """Set up SQLAlchemy event listeners for database monitoring."""
        
        @listens_for(engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query start time."""
            context._query_start_time = time.time()
            context._statement = statement[:200] + "..." if len(statement) > 200 else statement
            
        @listens_for(engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query completion and performance."""
            if hasattr(context, '_query_start_time'):
                duration = time.time() - context._query_start_time
                
                # Log slow queries
                if duration > self.slow_query_threshold:
                    self._log_slow_query(context._statement, duration, parameters)
                
                # Add breadcrumb for all queries in debug mode
                sentry_sdk.add_breadcrumb(
                    message=f"Database query executed",
                    category="db.query",
                    level="info" if duration < self.slow_query_threshold else "warning",
                    data={
                        "statement": context._statement,
                        "duration_ms": int(duration * 1000),
                        "parameters_count": len(parameters) if parameters else 0
                    }
                )
                
                # Set measurement for performance tracking
                sentry_sdk.set_measurement(f"db.query.duration", duration, "second")
        
        @listens_for(engine, "handle_error")
        def receive_handle_error(exception_context):
            """Capture database errors."""
            exception = exception_context.original_exception
            statement = getattr(exception_context, 'statement', 'Unknown')
            
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("error_category", "database")
                scope.set_tag("db_operation", "query")
                
                scope.set_context("database_error", {
                    "statement": statement[:500] if statement else "Unknown",
                    "engine": str(engine.url).split('@')[0] + '@***',  # Mask credentials
                    "error_type": type(exception).__name__
                })
                
                sentry_sdk.capture_exception(exception)
    
    def _log_slow_query(self, statement: str, duration: float, parameters: Any) -> None:
        """Log slow database queries to Sentry."""
        
        level = "warning" if duration < self.very_slow_query_threshold else "error"
        
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("performance_issue", "slow_query")
            scope.set_tag("query_duration_category", 
                         "slow" if duration < self.very_slow_query_threshold else "very_slow")
            
            scope.set_context("slow_query", {
                "statement": statement,
                "duration_seconds": duration,
                "duration_milliseconds": int(duration * 1000),
                "parameters_count": len(parameters) if parameters else 0
            })
            
            sentry_sdk.capture_message(
                f"Slow database query detected: {duration:.3f}s",
                level=level
            )


class CeleryMonitor:
    """Monitor Celery task execution with Sentry integration."""
    
    def __init__(self):
        self.task_performance_threshold = 30.0  # seconds
        
    def monitor_task_execution(self, task_name: str) -> Callable:
        """Decorator to monitor Celery task execution."""
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                with start_transaction(op="celery.task", name=task_name) as transaction:
                    start_time = time.time()
                    
                    # Set task context
                    sentry_sdk.set_tag("celery.task_name", task_name)
                    sentry_sdk.set_context("celery_task", {
                        "task_name": task_name,
                        "args_count": len(args),
                        "kwargs_count": len(kwargs)
                    })
                    
                    try:
                        # Execute the task
                        result = func(*args, **kwargs)
                        
                        # Calculate execution time
                        duration = time.time() - start_time
                        
                        # Set success metrics
                        transaction.set_tag("task_status", "success")
                        sentry_sdk.set_measurement("celery.task.duration", duration, "second")
                        
                        # Log slow tasks
                        if duration > self.task_performance_threshold:
                            sentry_sdk.capture_message(
                                f"Slow Celery task: {task_name} took {duration:.2f}s",
                                level="warning"
                            )
                        
                        # Add breadcrumb
                        sentry_sdk.add_breadcrumb(
                            message=f"Celery task completed: {task_name}",
                            category="celery.task",
                            level="info",
                            data={
                                "task_name": task_name,
                                "duration_seconds": duration,
                                "status": "success"
                            }
                        )
                        
                        return result
                        
                    except Exception as e:
                        duration = time.time() - start_time
                        
                        # Set error metrics
                        transaction.set_tag("task_status", "error")
                        sentry_sdk.set_measurement("celery.task.duration", duration, "second")
                        
                        # Capture task error with context
                        with sentry_sdk.push_scope() as scope:
                            scope.set_tag("error_category", "celery_task")
                            scope.set_tag("task_name", task_name)
                            
                            scope.set_context("celery_error", {
                                "task_name": task_name,
                                "duration_seconds": duration,
                                "error_type": type(e).__name__,
                                "args_count": len(args),
                                "kwargs_count": len(kwargs)
                            })
                            
                            sentry_sdk.capture_exception(e)
                        
                        raise
                        
            return wrapper
        return decorator
    
    def setup_celery_monitoring(self, celery_app) -> None:
        """Set up Celery signal handlers for monitoring."""
        
        try:
            from celery.signals import (
                task_prerun, task_postrun, task_failure, 
                task_retry, worker_ready
            )
            
            @task_prerun.connect
            def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
                """Handle task start."""
                sentry_sdk.add_breadcrumb(
                    message=f"Celery task started: {task.name}",
                    category="celery.task",
                    level="info",
                    data={"task_id": task_id, "task_name": task.name}
                )
            
            @task_postrun.connect
            def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
                """Handle task completion."""
                sentry_sdk.add_breadcrumb(
                    message=f"Celery task completed: {task.name}",
                    category="celery.task",
                    level="info",
                    data={"task_id": task_id, "task_name": task.name, "state": state}
                )
            
            @task_failure.connect
            def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
                """Handle task failures."""
                with sentry_sdk.push_scope() as scope:
                    scope.set_tag("error_category", "celery_task_failure")
                    scope.set_tag("task_id", task_id)
                    scope.set_tag("task_name", sender.name if sender else "unknown")
                    
                    scope.set_context("celery_failure", {
                        "task_id": task_id,
                        "task_name": sender.name if sender else "unknown",
                        "exception_type": type(exception).__name__ if exception else "unknown"
                    })
                    
                    sentry_sdk.capture_exception(exception)
            
            @task_retry.connect
            def task_retry_handler(sender=None, task_id=None, reason=None, einfo=None, **kwds):
                """Handle task retries."""
                sentry_sdk.add_breadcrumb(
                    message=f"Celery task retry: {sender.name if sender else 'unknown'}",
                    category="celery.retry",
                    level="warning",
                    data={
                        "task_id": task_id,
                        "task_name": sender.name if sender else "unknown",
                        "reason": str(reason) if reason else "unknown"
                    }
                )
            
            @worker_ready.connect
            def worker_ready_handler(sender=None, **kwds):
                """Handle worker ready signal."""
                sentry_sdk.capture_message("Celery worker ready", level="info")
                
            logger.info("Celery monitoring signals configured")
            
        except ImportError:
            logger.warning("Celery not available, skipping Celery monitoring setup")


class RedisMonitor:
    """Monitor Redis operations with Sentry integration."""
    
    def __init__(self):
        self.slow_operation_threshold = 0.5  # seconds
        
    def monitor_redis_operation(self, operation_name: str) -> Callable:
        """Decorator to monitor Redis operations."""
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                with start_span(op="cache.redis", description=operation_name) as span:
                    start_time = time.time()
                    
                    try:
                        result = func(*args, **kwargs)
                        duration = time.time() - start_time
                        
                        # Set span data
                        span.set_tag("redis.operation", operation_name)
                        span.set_tag("redis.status", "success")
                        span.set_data("duration_ms", int(duration * 1000))
                        
                        # Log slow operations
                        if duration > self.slow_operation_threshold:
                            sentry_sdk.capture_message(
                                f"Slow Redis operation: {operation_name} took {duration:.3f}s",
                                level="warning"
                            )
                        
                        return result
                        
                    except Exception as e:
                        duration = time.time() - start_time
                        
                        # Set error span data
                        span.set_tag("redis.operation", operation_name)
                        span.set_tag("redis.status", "error")
                        span.set_data("duration_ms", int(duration * 1000))
                        
                        # Capture Redis error
                        with sentry_sdk.push_scope() as scope:
                            scope.set_tag("error_category", "redis")
                            scope.set_tag("redis_operation", operation_name)
                            
                            scope.set_context("redis_error", {
                                "operation": operation_name,
                                "duration_seconds": duration,
                                "error_type": type(e).__name__
                            })
                            
                            sentry_sdk.capture_exception(e)
                        
                        raise
                        
            return wrapper
        return decorator


class BusinessLogicMonitor:
    """Monitor business logic operations and failures."""
    
    def monitor_booking_operation(self, operation_name: str) -> Callable:
        """Decorator to monitor booking-related operations."""
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                with start_span(op="business.booking", description=operation_name) as span:
                    start_time = time.time()
                    
                    try:
                        result = func(*args, **kwargs)
                        duration = time.time() - start_time
                        
                        span.set_tag("booking.operation", operation_name)
                        span.set_tag("booking.status", "success")
                        span.set_data("duration_ms", int(duration * 1000))
                        
                        # Add successful booking breadcrumb
                        sentry_sdk.add_breadcrumb(
                            message=f"Booking operation completed: {operation_name}",
                            category="business.booking",
                            level="info",
                            data={"operation": operation_name, "duration_ms": int(duration * 1000)}
                        )
                        
                        return result
                        
                    except Exception as e:
                        duration = time.time() - start_time
                        
                        span.set_tag("booking.operation", operation_name)
                        span.set_tag("booking.status", "error")
                        span.set_data("duration_ms", int(duration * 1000))
                        
                        # Use specialized booking error capture
                        from config.sentry import capture_booking_error
                        capture_booking_error(e)
                        
                        raise
                        
            return wrapper
        return decorator
    
    def monitor_payment_operation(self, operation_name: str) -> Callable:
        """Decorator to monitor payment-related operations."""
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                with start_span(op="business.payment", description=operation_name) as span:
                    start_time = time.time()
                    
                    try:
                        result = func(*args, **kwargs)
                        duration = time.time() - start_time
                        
                        span.set_tag("payment.operation", operation_name)
                        span.set_tag("payment.status", "success")
                        span.set_data("duration_ms", int(duration * 1000))
                        
                        return result
                        
                    except Exception as e:
                        duration = time.time() - start_time
                        
                        span.set_tag("payment.operation", operation_name)
                        span.set_tag("payment.status", "error")
                        span.set_data("duration_ms", int(duration * 1000))
                        
                        # Use specialized payment error capture
                        from config.sentry import capture_payment_error
                        capture_payment_error(e)
                        
                        raise
                        
            return wrapper
        return decorator


# Enhanced database session monitoring
@contextmanager
def monitored_db_session(session_factory):
    """Context manager for monitored database sessions."""
    
    with start_span(op="db.session", description="database_session") as span:
        session = session_factory()
        start_time = time.time()
        
        try:
            span.set_tag("db.session_status", "active")
            yield session
            
            # Commit if no exception
            if session.in_transaction():
                with start_span(op="db.commit", description="session_commit"):
                    session.commit()
                    span.set_tag("db.commit_status", "success")
            
            duration = time.time() - start_time
            span.set_data("session_duration_ms", int(duration * 1000))
            span.set_tag("db.session_status", "success")
            
        except Exception as e:
            duration = time.time() - start_time
            span.set_data("session_duration_ms", int(duration * 1000))
            span.set_tag("db.session_status", "error")
            
            # Rollback on error
            if session.in_transaction():
                with start_span(op="db.rollback", description="session_rollback"):
                    session.rollback()
            
            # Capture database session error
            with sentry_sdk.push_scope() as scope:
                scope.set_tag("error_category", "database_session")
                scope.set_context("db_session_error", {
                    "duration_seconds": duration,
                    "error_type": type(e).__name__,
                    "in_transaction": session.in_transaction()
                })
                sentry_sdk.capture_exception(e)
            
            raise
            
        finally:
            session.close()


# Initialize monitors
database_monitor = DatabaseMonitor()
celery_monitor = CeleryMonitor()
redis_monitor = RedisMonitor()
business_monitor = BusinessLogicMonitor()

# Initialize the main sentry service
sentry_service = SentryService()
sentry_service.initialize()


# Export monitoring functions and decorators
__all__ = [
    'database_monitor',
    'celery_monitor', 
    'redis_monitor',
    'business_monitor',
    'sentry_service',
    'monitored_db_session'
]