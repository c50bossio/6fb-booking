"""Database timeout utilities for preventing hanging queries."""

import time
import signal
import functools
from contextlib import contextmanager
from typing import Any, Callable, Optional, TypeVar, Generic
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, TimeoutError
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

class DatabaseTimeoutError(Exception):
    """Raised when a database query exceeds the timeout limit."""
    pass

class QueryTimeoutHandler:
    """Handles query timeouts and circuit breaker pattern."""
    
    def __init__(self, default_timeout: float = 30.0, max_failures: int = 5):
        self.default_timeout = default_timeout
        self.max_failures = max_failures
        self.failure_count = 0
        self.last_failure_time = 0
        self.circuit_open = False
        self.circuit_timeout = 60.0  # 1 minute circuit breaker timeout
    
    def is_circuit_open(self) -> bool:
        """Check if circuit breaker is open."""
        if self.circuit_open:
            if time.time() - self.last_failure_time > self.circuit_timeout:
                logger.info("Circuit breaker timeout expired, attempting to close circuit")
                self.circuit_open = False
                self.failure_count = 0
            else:
                return True
        return False
    
    def record_success(self):
        """Record successful query execution."""
        self.failure_count = 0
        self.circuit_open = False
    
    def record_failure(self):
        """Record failed query execution."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.max_failures:
            logger.error(f"Circuit breaker opened after {self.failure_count} failures")
            self.circuit_open = True

# Global timeout handler instance
timeout_handler = QueryTimeoutHandler()

def timeout_query(timeout_seconds: float = 30.0):
    """Decorator to add timeout to database queries."""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Check circuit breaker
            if timeout_handler.is_circuit_open():
                raise DatabaseTimeoutError("Database circuit breaker is open")
            
            start_time = time.time()
            
            def timeout_handler_func(signum, frame):
                raise DatabaseTimeoutError(f"Query exceeded timeout of {timeout_seconds} seconds")
            
            # Set up timeout signal (Unix only)
            try:
                old_handler = signal.signal(signal.SIGALRM, timeout_handler_func)
                signal.alarm(int(timeout_seconds))
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Log slow queries
                    if execution_time > timeout_seconds * 0.8:
                        logger.warning(f"Slow query detected: {func.__name__} took {execution_time:.3f}s")
                    
                    timeout_handler.record_success()
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    if isinstance(e, (SQLAlchemyError, DatabaseTimeoutError)):
                        logger.error(f"Database query failed: {func.__name__} after {execution_time:.3f}s - {str(e)}")
                        timeout_handler.record_failure()
                    
                    raise
                finally:
                    signal.alarm(0)
                    signal.signal(signal.SIGALRM, old_handler)
                    
            except (OSError, AttributeError):
                # Fallback for Windows or systems without signal support
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    if execution_time > timeout_seconds:
                        logger.warning(f"Query exceeded timeout but could not be interrupted: {func.__name__} took {execution_time:.3f}s")
                    
                    timeout_handler.record_success()
                    return result
                    
                except Exception as e:
                    if isinstance(e, SQLAlchemyError):
                        timeout_handler.record_failure()
                    raise
        
        return wrapper
    return decorator

@contextmanager
def query_timeout(db: Session, timeout_seconds: float = 30.0):
    """Context manager for database query timeouts."""
    if timeout_handler.is_circuit_open():
        raise DatabaseTimeoutError("Database circuit breaker is open")
    
    start_time = time.time()
    
    try:
        # Configure session timeout if supported (PostgreSQL only)
        if hasattr(db, 'execute'):
            try:
                # Only set timeout for PostgreSQL databases
                db_url = str(db.get_bind().url)
                if 'postgresql' in db_url:
                    db.execute("SET SESSION statement_timeout = :timeout", {"timeout": f"{int(timeout_seconds * 1000)}ms"})
            except Exception as e:
                # Ignore timeout setting errors for non-PostgreSQL databases
                logger.debug(f"Could not set session timeout: {e}")
        
        yield db
        
        execution_time = time.time() - start_time
        if execution_time > timeout_seconds * 0.8:
            logger.warning(f"Slow database operation detected: {execution_time:.3f}s")
        
        timeout_handler.record_success()
        
    except Exception as e:
        execution_time = time.time() - start_time
        
        if isinstance(e, SQLAlchemyError):
            logger.error(f"Database operation failed after {execution_time:.3f}s - {str(e)}")
            timeout_handler.record_failure()
        
        raise
    finally:
        # Reset timeout (PostgreSQL only)
        try:
            if hasattr(db, 'execute'):
                db_url = str(db.get_bind().url)
                if 'postgresql' in db_url:
                    db.execute("SET SESSION statement_timeout = DEFAULT")
        except Exception as e:
            logger.debug(f"Could not reset session timeout: {e}")
            pass

def with_query_timeout(db: Session, query_func: Callable[[], T], timeout_seconds: float = 30.0) -> T:
    """Execute a query function with timeout protection."""
    with query_timeout(db, timeout_seconds):
        return query_func()

# Optimized query patterns
def get_appointment_conflicts_optimized(
    db: Session, 
    barber_id: int, 
    start_time: Any, 
    duration_minutes: int,
    exclude_appointment_id: Optional[int] = None
) -> bool:
    """Optimized appointment conflict checking with timeout protection."""
    
    @timeout_query(timeout_seconds=15.0)  # Shorter timeout for conflict checks
    def _check_conflicts():
        from sqlalchemy import exists, and_, or_
        import models
        from datetime import timedelta
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        query = db.query(
            exists().where(
                and_(
                    models.Appointment.barber_id == barber_id,
                    models.Appointment.status.in_(["scheduled", "confirmed", "pending"]),
                    # Time overlap check
                    or_(
                        # New appointment starts during existing appointment
                        and_(
                            models.Appointment.start_time <= start_time,
                            models.Appointment.start_time + timedelta(minutes=models.Appointment.duration_minutes) > start_time
                        ),
                        # Existing appointment starts during new appointment
                        and_(
                            models.Appointment.start_time >= start_time,
                            models.Appointment.start_time < end_time
                        )
                    )
                )
            )
        )
        
        if exclude_appointment_id:
            query = query.filter(models.Appointment.id != exclude_appointment_id)
        
        return query.scalar()
    
    return _check_conflicts()

def get_barber_availability_optimized(
    db: Session,
    barber_id: int,
    check_date: Any,
    start_time: Any,
    end_time: Any
) -> bool:
    """Optimized barber availability checking with caching."""
    
    @timeout_query(timeout_seconds=10.0)  # Even shorter timeout for availability
    def _check_availability():
        import models
        from datetime import timedelta
        
        # Quick availability check with minimal queries
        day_of_week = check_date.weekday()
        
        # Check regular availability (single query)
        has_availability = db.query(
            exists().where(
                and_(
                    models.BarberAvailability.barber_id == barber_id,
                    models.BarberAvailability.day_of_week == day_of_week,
                    models.BarberAvailability.is_active == True,
                    models.BarberAvailability.start_time <= start_time,
                    models.BarberAvailability.end_time >= end_time
                )
            )
        ).scalar()
        
        if not has_availability:
            return False
        
        # Check time off (single query)
        has_time_off = db.query(
            exists().where(
                and_(
                    models.BarberTimeOff.barber_id == barber_id,
                    models.BarberTimeOff.status == "approved",
                    models.BarberTimeOff.start_date <= check_date,
                    models.BarberTimeOff.end_date >= check_date
                )
            )
        ).scalar()
        
        return not has_time_off
    
    return _check_availability()