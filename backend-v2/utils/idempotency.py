"""
Idempotency system for preventing duplicate operations.

This module provides:
1. IdempotencyKey generation and validation
2. Idempotent operation tracking in database/cache
3. Decorator for making endpoints idempotent
4. Support for critical financial operations
"""

import uuid
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable, Union
from functools import wraps
from dataclasses import dataclass

from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


@dataclass
class IdempotencyResult:
    """Result of an idempotent operation"""
    is_duplicate: bool
    response_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class IdempotencyKeyGenerator:
    """Generates and validates idempotency keys"""
    
    @staticmethod
    def generate_key(prefix: str = "idem") -> str:
        """Generate a new idempotency key"""
        unique_id = str(uuid.uuid4())
        return f"{prefix}_{unique_id}"
    
    @staticmethod
    def validate_key(key: str) -> bool:
        """Validate idempotency key format"""
        if not key or not isinstance(key, str):
            return False
        
        # Basic format check: prefix_uuid
        parts = key.split("_", 1)
        if len(parts) != 2:
            return False
        
        # Check if second part looks like a UUID
        try:
            uuid.UUID(parts[1])
            return True
        except ValueError:
            return False
    
    @staticmethod
    def generate_content_hash(data: Union[Dict, str, bytes]) -> str:
        """Generate hash of request content for duplicate detection"""
        if isinstance(data, dict):
            # Sort keys for consistent hashing
            content = json.dumps(data, sort_keys=True, default=str)
        elif isinstance(data, str):
            content = data
        elif isinstance(data, bytes):
            content = data.decode('utf-8', errors='ignore')
        else:
            content = str(data)
        
        return hashlib.sha256(content.encode('utf-8')).hexdigest()


class IdempotencyManager:
    """Manages idempotent operations using database storage"""
    
    def __init__(self, db: Session, default_ttl_hours: int = 24):
        self.db = db
        self.default_ttl_hours = default_ttl_hours
    
    def store_result(
        self,
        idempotency_key: str,
        operation_type: str,
        user_id: Optional[int],
        request_hash: str,
        response_data: Dict[str, Any],
        ttl_hours: Optional[int] = None
    ) -> None:
        """Store the result of an idempotent operation"""
        from models.idempotency import IdempotencyKey as IdempotencyKeyModel
        
        expires_at = datetime.utcnow() + timedelta(
            hours=ttl_hours or self.default_ttl_hours
        )
        
        idempotency_record = IdempotencyKeyModel(
            key=idempotency_key,
            operation_type=operation_type,
            user_id=user_id,
            request_hash=request_hash,
            response_data=response_data,
            created_at=datetime.utcnow(),
            expires_at=expires_at
        )
        
        try:
            self.db.add(idempotency_record)
            self.db.commit()
            logger.info(f"Stored idempotency result for key: {idempotency_key}")
        except IntegrityError:
            # Key already exists, rollback and continue
            self.db.rollback()
            logger.warning(f"Idempotency key already exists: {idempotency_key}")
    
    def get_result(self, idempotency_key: str) -> IdempotencyResult:
        """Get the result of a previous idempotent operation"""
        from models.idempotency import IdempotencyKey as IdempotencyKeyModel
        
        record = self.db.query(IdempotencyKeyModel).filter(
            IdempotencyKeyModel.key == idempotency_key,
            IdempotencyKeyModel.expires_at > datetime.utcnow()
        ).first()
        
        if record:
            return IdempotencyResult(
                is_duplicate=True,
                response_data=record.response_data,
                created_at=record.created_at,
                expires_at=record.expires_at
            )
        
        return IdempotencyResult(is_duplicate=False)
    
    def cleanup_expired(self) -> int:
        """Remove expired idempotency keys"""
        from models.idempotency import IdempotencyKey as IdempotencyKeyModel
        
        deleted_count = self.db.query(IdempotencyKeyModel).filter(
            IdempotencyKeyModel.expires_at <= datetime.utcnow()
        ).delete()
        
        self.db.commit()
        
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired idempotency keys")
        
        return deleted_count
    
    def check_request_match(
        self, 
        idempotency_key: str, 
        request_hash: str
    ) -> bool:
        """Check if request hash matches stored one for the idempotency key"""
        from models.idempotency import IdempotencyKey as IdempotencyKeyModel
        
        record = self.db.query(IdempotencyKeyModel).filter(
            IdempotencyKeyModel.key == idempotency_key,
            IdempotencyKeyModel.expires_at > datetime.utcnow()
        ).first()
        
        if record:
            return record.request_hash == request_hash
        return True  # No existing record, so it's valid


def idempotent_operation(
    operation_type: str,
    ttl_hours: int = 24,
    extract_user_id: Optional[Callable] = None,
    key_header: str = "Idempotency-Key"
):
    """
    Decorator to make an endpoint idempotent.
    
    Args:
        operation_type: Type of operation (e.g., "payment_intent", "payout")
        ttl_hours: Time to live for idempotency keys in hours
        extract_user_id: Function to extract user ID from the decorated function args
        key_header: Header name for idempotency key
    """
    def decorator(func: Callable) -> Callable:
        pass
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Find request and db in the function arguments
            request = None
            db = None
            user_id = None
            
            # Check args for Request and Session
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif hasattr(arg, 'query'):  # SQLAlchemy Session
                    db = arg
            
            # Check kwargs for Request and Session
            for key, value in kwargs.items():
                if isinstance(value, Request):
                    request = value
                elif hasattr(value, 'query'):  # SQLAlchemy Session
                    db = value
            
            if not request or not db:
                # If we can't find request/db, proceed without idempotency
                logger.warning(f"Could not find request/db for idempotent operation: {operation_type}")
                return func(*args, **kwargs)
            
            # Get idempotency key from header
            idempotency_key = request.headers.get(key_header)
            
            if not idempotency_key:
                # No idempotency key provided, proceed normally
                return func(*args, **kwargs)
            
            # Validate idempotency key format
            if not IdempotencyKeyGenerator.validate_key(idempotency_key):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid idempotency key format"
                )
            
            # Extract user ID
            if extract_user_id:
                try:
                    user_id = extract_user_id(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"Could not extract user ID: {e}")
            
            # Generate request hash (simplified for sync)
            try:
                # For sync endpoints, we'll hash the available data
                request_data = {
                    'method': request.method,
                    'url': str(request.url),
                    'user_id': user_id,
                    # Add query params and headers for hash
                    'query_params': str(request.query_params),
                    'path_params': str(request.path_params) if hasattr(request, 'path_params') else ''
                }
                request_hash = IdempotencyKeyGenerator.generate_content_hash(request_data)
            except Exception as e:
                logger.error(f"Error generating request hash: {e}")
                # Proceed without hash check
                request_hash = "unknown"
            
            # Create idempotency manager
            manager = IdempotencyManager(db, ttl_hours)
            
            # Check for existing result
            result = manager.get_result(idempotency_key)
            
            if result.is_duplicate:
                # Check if request matches (prevent key reuse with different data)
                if not manager.check_request_match(idempotency_key, request_hash):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Idempotency key reused with different request data"
                    )
                
                logger.info(f"Returning cached result for idempotency key: {idempotency_key}")
                return result.response_data
            
            # Execute the operation
            try:
                response = func(*args, **kwargs)
                
                # Store the result for future duplicate requests
                if isinstance(response, dict):
                    response_data = response
                else:
                    # Handle different response types
                    if hasattr(response, 'dict'):
                        response_data = response.dict()
                    elif hasattr(response, '__dict__'):
                        response_data = response.__dict__
                    else:
                        response_data = {"result": str(response)}
                
                manager.store_result(
                    idempotency_key=idempotency_key,
                    operation_type=operation_type,
                    user_id=user_id,
                    request_hash=request_hash,
                    response_data=response_data,
                    ttl_hours=ttl_hours
                )
                
                return response
                
            except Exception as e:
                # Don't store failed operations
                logger.error(f"Idempotent operation failed: {e}")
                raise
        
        return wrapper
    return decorator


def get_current_user_id(*args, **kwargs) -> Optional[int]:
    """Helper function to extract current user ID from FastAPI dependencies"""
    for key, value in kwargs.items():
        if key == 'current_user' and hasattr(value, 'id'):
            return value.id
    return None


def webhook_idempotent(
    operation_type: str,
    ttl_hours: int = 48,  # Longer TTL for webhooks
    event_id_header: str = "stripe-request-id"  # or custom header
):
    """
    Decorator specifically for webhook idempotency.
    Uses event ID from webhook headers instead of custom idempotency key.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request and db in the function arguments
            request = None
            db = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif hasattr(arg, 'query'):  # SQLAlchemy Session
                    db = arg
            
            for key, value in kwargs.items():
                if isinstance(value, Request):
                    request = value
                elif hasattr(value, 'query'):  # SQLAlchemy Session
                    db = value
            
            if not request or not db:
                logger.warning(f"Could not find request/db for webhook idempotency: {operation_type}")
                return await func(*args, **kwargs)
            
            # Get event ID from headers (Stripe uses this)
            event_id = request.headers.get(event_id_header)
            
            if not event_id:
                # Try to extract from request body for Stripe events
                try:
                    import json
                    body = await request.body()
                    event_data = json.loads(body)
                    event_id = event_data.get('id')
                except:
                    pass
            
            if not event_id:
                # No event ID, proceed without idempotency
                return await func(*args, **kwargs)
            
            # Use event ID as idempotency key
            idempotency_key = f"webhook_{operation_type}_{event_id}"
            
            # Generate request hash
            try:
                request_body = await request.body()
                request_hash = IdempotencyKeyGenerator.generate_content_hash(request_body)
            except Exception as e:
                logger.error(f"Error generating webhook request hash: {e}")
                request_hash = "unknown"
            
            # Create idempotency manager
            manager = IdempotencyManager(db, ttl_hours)
            
            # Check for existing result
            result = manager.get_result(idempotency_key)
            
            if result.is_duplicate:
                logger.info(f"Webhook already processed: {idempotency_key}")
                return result.response_data or {"status": "already_processed"}
            
            # Execute the webhook handler
            try:
                response = await func(*args, **kwargs)
                
                # Store the result
                response_data = response if isinstance(response, dict) else {"status": "success"}
                
                manager.store_result(
                    idempotency_key=idempotency_key,
                    operation_type=f"webhook_{operation_type}",
                    user_id=None,  # Webhooks don't have user context
                    request_hash=request_hash,
                    response_data=response_data,
                    ttl_hours=ttl_hours
                )
                
                return response
                
            except Exception as e:
                logger.error(f"Webhook operation failed: {e}")
                raise
        
        return wrapper
    return decorator


# Utility functions for cleanup and monitoring
def cleanup_expired_idempotency_keys(db: Session) -> int:
    """Clean up expired idempotency keys"""
    manager = IdempotencyManager(db)
    return manager.cleanup_expired()


def get_idempotency_stats(db: Session) -> Dict[str, Any]:
    """Get statistics about idempotency key usage"""
    from models.idempotency import IdempotencyKey as IdempotencyKeyModel
    
    total_keys = db.query(IdempotencyKeyModel).count()
    active_keys = db.query(IdempotencyKeyModel).filter(
        IdempotencyKeyModel.expires_at > datetime.utcnow()
    ).count()
    expired_keys = total_keys - active_keys
    
    # Get operation type breakdown
    operation_stats = db.query(
        IdempotencyKeyModel.operation_type,
        db.func.count(IdempotencyKeyModel.id)
    ).group_by(IdempotencyKeyModel.operation_type).all()
    
    return {
        "total_keys": total_keys,
        "active_keys": active_keys,
        "expired_keys": expired_keys,
        "operation_types": dict(operation_stats)
    }