"""
Database utilities for transaction management and error handling
"""
from contextlib import contextmanager
from functools import wraps
from typing import Callable, Any, Optional, Dict, Type
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
import logging
import time
from datetime import datetime, timedelta
import json
import traceback

from database import get_db
from models import WebhookEvent, WebhookRetry
from utils.idempotency import IdempotencyManager

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Base exception for database operations"""
    pass


class TransactionError(DatabaseError):
    """Exception for transaction-specific errors"""
    pass


class RetryableError(DatabaseError):
    """Exception for errors that can be retried"""
    pass


@contextmanager
def db_transaction(db: Session, rollback_on_error: bool = True):
    """
    Context manager for database transactions with proper error handling
    
    Usage:
        with db_transaction(db) as transaction:
            # Your database operations here
            transaction.commit()  # Explicit commit
    """
    try:
        yield db
        if db.is_active:
            db.commit()
    except IntegrityError as e:
        if rollback_on_error and db.is_active:
            db.rollback()
        logger.error(f"Database integrity error: {str(e)}")
        raise TransactionError(f"Data integrity violation: {str(e)}")
    except OperationalError as e:
        if rollback_on_error and db.is_active:
            db.rollback()
        logger.error(f"Database operational error: {str(e)}")
        raise RetryableError(f"Database connection error: {str(e)}")
    except SQLAlchemyError as e:
        if rollback_on_error and db.is_active:
            db.rollback()
        logger.error(f"Database error: {str(e)}")
        raise DatabaseError(f"Database operation failed: {str(e)}")
    except Exception as e:
        if rollback_on_error and db.is_active:
            db.rollback()
        logger.error(f"Unexpected error in transaction: {str(e)}")
        raise


def transactional(
    max_retries: int = 3,
    retry_delay: float = 1.0,
    exponential_backoff: bool = True,
    retry_on: tuple = (RetryableError, OperationalError)
):
    """
    Decorator for functions that perform database operations with automatic retry logic
    
    Args:
        max_retries: Maximum number of retry attempts
        retry_delay: Initial delay between retries in seconds
        exponential_backoff: Whether to use exponential backoff for retries
        retry_on: Tuple of exceptions that trigger a retry
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retry_on as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = retry_delay * (2 ** attempt if exponential_backoff else 1)
                        logger.warning(
                            f"Retrying {func.__name__} after {delay}s "
                            f"(attempt {attempt + 1}/{max_retries}): {str(e)}"
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"Max retries exceeded for {func.__name__}: {str(e)}"
                        )
                except Exception as e:
                    logger.error(f"Non-retryable error in {func.__name__}: {str(e)}")
                    raise
            
            if last_exception:
                raise last_exception
        
        return wrapper
    return decorator


class WebhookTransactionManager:
    """
    Manages webhook processing with idempotency, error handling, and retry logic
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.idempotency_manager = IdempotencyManager(db)
    
    @contextmanager
    def process_webhook(
        self,
        event_type: str,
        event_id: str,
        source: str = "stripe",
        payload: Optional[Dict] = None
    ):
        """
        Context manager for processing webhooks with full error handling
        
        Usage:
            with webhook_manager.process_webhook("payment.succeeded", event_id) as ctx:
                if ctx.is_duplicate:
                    return ctx.cached_result
                
                # Process webhook
                result = process_payment(...)
                ctx.set_result(result)
        """
        context = WebhookContext(
            event_type=event_type,
            event_id=event_id,
            source=source,
            payload=payload
        )
        
        try:
            # Check for idempotency
            existing_event = self.db.query(WebhookEvent).filter(
                WebhookEvent.event_id == event_id,
                WebhookEvent.source == source
            ).first()
            
            if existing_event and existing_event.status == "processed":
                context.is_duplicate = True
                context.cached_result = existing_event.result
                logger.info(f"Duplicate webhook event: {source}/{event_id}")
                yield context
                return
            
            # Create or update webhook event record
            if not existing_event:
                webhook_event = WebhookEvent(
                    source=source,
                    event_type=event_type,
                    event_id=event_id,
                    payload=json.dumps(payload) if payload else None,
                    status="processing",
                    created_at=datetime.utcnow()
                )
                self.db.add(webhook_event)
                self.db.flush()
            else:
                existing_event.status = "processing"
                existing_event.retry_count += 1
                webhook_event = existing_event
            
            context.webhook_event = webhook_event
            
            # Yield control to process webhook
            yield context
            
            # If successful, mark as processed
            if context.result is not None:
                webhook_event.status = "processed"
                webhook_event.result = json.dumps(context.result) if context.result else None
                webhook_event.processed_at = datetime.utcnow()
                self.db.commit()
                
        except Exception as e:
            # Log error and mark as failed
            error_details = {
                "error": str(e),
                "traceback": traceback.format_exc()
            }
            
            if context.webhook_event:
                context.webhook_event.status = "failed"
                context.webhook_event.error = json.dumps(error_details)
                context.webhook_event.failed_at = datetime.utcnow()
                
                # Schedule retry if retryable
                if isinstance(e, RetryableError) and context.webhook_event.retry_count < 5:
                    self._schedule_retry(context.webhook_event)
            
            self.db.commit()
            raise
    
    def _schedule_retry(self, webhook_event: WebhookEvent):
        """Schedule a webhook for retry with exponential backoff"""
        retry_delays = [60, 300, 900, 3600, 7200]  # 1min, 5min, 15min, 1hr, 2hr
        delay_seconds = retry_delays[min(webhook_event.retry_count, len(retry_delays) - 1)]
        
        retry = WebhookRetry(
            webhook_event_id=webhook_event.id,
            retry_at=datetime.utcnow() + timedelta(seconds=delay_seconds),
            attempt_number=webhook_event.retry_count + 1
        )
        self.db.add(retry)
        logger.info(
            f"Scheduled webhook retry for {webhook_event.source}/{webhook_event.event_id} "
            f"in {delay_seconds}s (attempt {retry.attempt_number})"
        )


class WebhookContext:
    """Context object for webhook processing"""
    
    def __init__(self, event_type: str, event_id: str, source: str, payload: Optional[Dict] = None):
        self.event_type = event_type
        self.event_id = event_id
        self.source = source
        self.payload = payload
        self.is_duplicate = False
        self.cached_result = None
        self.result = None
        self.webhook_event = None
    
    def set_result(self, result: Any):
        """Set the result of webhook processing"""
        self.result = result


def safe_db_operation(
    func: Callable,
    db: Session,
    error_message: str = "Database operation failed",
    default_return: Any = None,
    raise_on_error: bool = False
) -> Any:
    """
    Execute a database operation safely with error handling
    
    Args:
        func: Function to execute
        db: Database session
        error_message: Custom error message
        default_return: Value to return on error
        raise_on_error: Whether to raise exception on error
        
    Returns:
        Result of function or default_return on error
    """
    try:
        with db_transaction(db):
            return func()
    except Exception as e:
        logger.error(f"{error_message}: {str(e)}")
        if raise_on_error:
            raise
        return default_return


def bulk_operation(
    db: Session,
    items: list,
    operation: Callable,
    batch_size: int = 100,
    on_error: str = "skip"  # "skip", "rollback", "raise"
) -> Dict[str, Any]:
    """
    Perform bulk database operations with batching and error handling
    
    Args:
        db: Database session
        items: List of items to process
        operation: Function to apply to each item
        batch_size: Number of items per batch
        on_error: Error handling strategy
        
    Returns:
        Dictionary with results and error statistics
    """
    results = {
        "processed": 0,
        "failed": 0,
        "errors": [],
        "successful_items": [],
        "failed_items": []
    }
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        
        try:
            with db_transaction(db):
                for item in batch:
                    try:
                        result = operation(item)
                        results["processed"] += 1
                        results["successful_items"].append(item)
                    except Exception as e:
                        results["failed"] += 1
                        results["errors"].append({
                            "item": item,
                            "error": str(e)
                        })
                        results["failed_items"].append(item)
                        
                        if on_error == "raise":
                            raise
                        elif on_error == "rollback":
                            db.rollback()
                            break
                        # else: skip and continue
                
                if on_error != "rollback" or results["failed"] == 0:
                    db.commit()
                    
        except Exception as e:
            logger.error(f"Bulk operation batch failed: {str(e)}")
            if on_error == "raise":
                raise
    
    return results