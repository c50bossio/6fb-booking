"""
Multi-tenancy Security Middleware for BookedBarber V2
Ensures data isolation between different barbershop locations
"""

from typing import Optional, List, Set
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging
from functools import wraps
from models import User

logger = logging.getLogger(__name__)


class LocationAccessError(HTTPException):
    """Raised when user tries to access data from unauthorized location"""
    def __init__(self, detail: str = "Access denied to this location's data"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class MultiTenancyMiddleware:
    """
    Middleware to enforce location-based access control
    Ensures users can only access data from their assigned location(s)
    """
    
    def __init__(self, app):
        self.app = app
    
    # Endpoints that don't require location validation
    EXEMPT_PATHS = {
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        "/api/v2/health",
        "/api/v1/webhooks",  # Webhooks need special handling
    }
    
    # Endpoints that require special handling
    ADMIN_ONLY_PATHS = {
        "/api/v1/admin",
        "/api/v1/locations/create",
        "/api/v1/locations/update",
        "/api/v1/locations/delete",
    }
    
    async def __call__(self, scope, receive, send):
        """ASGI interface for middleware"""
        from starlette.middleware.base import BaseHTTPMiddleware
        middleware = BaseHTTPMiddleware(self.app, self.dispatch)
        return await middleware(scope, receive, send)
    
    async def dispatch(self, request: Request, call_next):
        """Process request and enforce location-based access"""
        
        # Skip validation for exempt paths
        if self._is_exempt_path(request.url.path):
            return await call_next(request)
        
        # Extract user from request (set by auth middleware)
        user = getattr(request.state, "user", None)
        if not user:
            # Let auth middleware handle unauthenticated requests
            return await call_next(request)
        
        # Super admins can access all locations
        if user.role == "super_admin":
            request.state.allowed_locations = "all"
            return await call_next(request)
        
        # Admin paths require admin role
        if self._is_admin_path(request.url.path) and user.role not in ["admin", "super_admin"]:
            raise LocationAccessError("Admin access required")
        
        # Regular users must have location_id
        if not user.location_id and user.role not in ["admin", "super_admin"]:
            raise LocationAccessError("User not assigned to any location")
        
        # Set allowed locations on request state
        request.state.allowed_locations = self._get_allowed_locations(user)
        
        # Log access for audit trail
        logger.info(
            f"User {user.id} ({user.email}) accessing {request.url.path} "
            f"with allowed locations: {request.state.allowed_locations}"
        )
        
        response = await call_next(request)
        return response
    
    def _is_exempt_path(self, path: str) -> bool:
        """Check if path is exempt from location validation"""
        return any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS)
    
    def _is_admin_path(self, path: str) -> bool:
        """Check if path requires admin access"""
        return any(path.startswith(admin) for admin in self.ADMIN_ONLY_PATHS)
    
    def _get_allowed_locations(self, user: User) -> List[int]:
        """Get list of location IDs user can access"""
        if user.role == "super_admin":
            return "all"
        elif user.role == "admin":
            # Admins can access their location and potentially child locations
            # This could be expanded based on business rules
            return [user.location_id] if user.location_id else []
        else:
            # Regular users and barbers can only access their assigned location
            return [user.location_id] if user.location_id else []


def location_filter(query, model_class, request: Request):
    """
    Apply location filter to SQLAlchemy query based on user's allowed locations
    
    Args:
        query: SQLAlchemy query object
        model_class: The model class being queried
        request: FastAPI request object with user context
    
    Returns:
        Filtered query
    """
    allowed_locations = getattr(request.state, "allowed_locations", None)
    
    if not allowed_locations:
        # No locations allowed - return empty result
        return query.filter(False)
    
    if allowed_locations == "all":
        # Super admin - no filter needed
        return query
    
    # Check if model has location_id field
    if hasattr(model_class, "location_id"):
        return query.filter(model_class.location_id.in_(allowed_locations))
    
    # Check if model has user relationship with location
    if hasattr(model_class, "user_id"):
        return query.join(User).filter(User.location_id.in_(allowed_locations))
    
    # Check if model has barber relationship with location
    if hasattr(model_class, "barber_id"):
        return query.join(User, User.id == model_class.barber_id).filter(
            User.location_id.in_(allowed_locations)
        )
    
    # If no location relationship found, log warning
    logger.warning(
        f"Model {model_class.__name__} has no location relationship. "
        f"Data may not be properly filtered for multi-tenancy."
    )
    
    return query


def validate_location_access(
    user: User,
    location_id: int,
    operation: str = "access"
) -> bool:
    """
    Validate if user can perform operation on specific location
    
    Args:
        user: User object
        location_id: Location ID to check
        operation: Type of operation (access, create, update, delete)
    
    Returns:
        True if allowed, raises LocationAccessError if not
    """
    # Super admins can do anything
    if user.role == "super_admin":
        return True
    
    # Admins can manage their own location
    if user.role == "admin":
        if user.location_id == location_id:
            return True
        else:
            raise LocationAccessError(
                f"Admin can only {operation} their assigned location"
            )
    
    # Regular users can only access their location
    if user.location_id == location_id:
        if operation in ["access", "read"]:
            return True
        else:
            raise LocationAccessError(
                f"Insufficient permissions to {operation} location data"
            )
    else:
        raise LocationAccessError(
            f"User not authorized to {operation} this location"
        )


def require_location_access(operation: str = "access"):
    """
    Decorator to validate location access for specific operations
    
    Usage:
        @require_location_access("update")
        async def update_location(location_id: int, current_user: User = Depends(get_current_user)):
            # Function will only execute if user has update access to location
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract location_id and current_user from kwargs
            location_id = kwargs.get("location_id")
            current_user = kwargs.get("current_user")
            
            if not location_id or not current_user:
                raise ValueError(
                    "require_location_access decorator requires "
                    "location_id and current_user parameters"
                )
            
            # Validate access
            validate_location_access(current_user, location_id, operation)
            
            # Call original function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class LocationContext:
    """
    Context manager for location-based operations
    Ensures all database operations are scoped to allowed locations
    """
    
    def __init__(self, db: Session, user: User, allowed_locations: List[int] = None):
        self.db = db
        self.user = user
        self.allowed_locations = allowed_locations or self._get_user_locations(user)
    
    def _get_user_locations(self, user: User) -> List[int]:
        """Get locations accessible by user"""
        if user.role == "super_admin":
            return "all"
        return [user.location_id] if user.location_id else []
    
    def filter_query(self, query, model_class):
        """Apply location filter to query"""
        if self.allowed_locations == "all":
            return query
        
        if not self.allowed_locations:
            return query.filter(False)
        
        # Apply appropriate filter based on model
        if hasattr(model_class, "location_id"):
            return query.filter(model_class.location_id.in_(self.allowed_locations))
        
        return query
    
    def validate_create(self, location_id: int):
        """Validate if user can create in location"""
        if self.allowed_locations == "all":
            return True
        
        if location_id not in self.allowed_locations:
            raise LocationAccessError(
                "Cannot create data for unauthorized location"
            )
        
        return True
    
    def validate_update(self, entity):
        """Validate if user can update entity"""
        if self.allowed_locations == "all":
            return True
        
        entity_location = getattr(entity, "location_id", None)
        if entity_location and entity_location not in self.allowed_locations:
            raise LocationAccessError(
                "Cannot update data from unauthorized location"
            )
        
        return True
    
    def validate_delete(self, entity):
        """Validate if user can delete entity"""
        if self.allowed_locations == "all":
            return True
        
        entity_location = getattr(entity, "location_id", None)
        if entity_location and entity_location not in self.allowed_locations:
            raise LocationAccessError(
                "Cannot delete data from unauthorized location"
            )
        
        return True