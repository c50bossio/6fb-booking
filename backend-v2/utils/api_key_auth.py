"""
API Key Authentication utilities for public API endpoints.

Provides authentication and authorization decorators for API key-based access.
"""

from fastapi import HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Callable
from functools import wraps

from db import get_db
from services.api_key_service import APIKeyService
from utils.audit_logger_bypass import get_audit_logger
import logging

logger = logging.getLogger(__name__)
audit_logger = get_audit_logger()


def get_api_key_from_header(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None)
) -> str:
    """
    Extract API key from request headers.
    
    Supports two header formats:
    - Authorization: Bearer <api_key>
    - X-API-Key: <api_key>
    """
    api_key = None
    
    # Try Authorization header first
    if authorization:
        if authorization.startswith("Bearer "):
            api_key = authorization[7:]  # Remove "Bearer " prefix
        else:
            # Direct API key in Authorization header
            api_key = authorization
    
    # Try X-API-Key header
    elif x_api_key:
        api_key = x_api_key
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Provide in Authorization header (Bearer <key>) or X-API-Key header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return api_key


def require_api_key(
    api_key: str = Depends(get_api_key_from_header),
    db: Session = Depends(get_db)
) -> dict:
    """
    Dependency that validates API key and returns key information.
    
    Returns:
        dict: API key information including user_id, permissions, etc.
    """
    # Validate API key
    api_key_data = APIKeyService.validate_api_key(
        api_key=api_key,
        db=db
    )
    
    if not api_key_data:
        # Log failed authentication attempt
        audit_logger.log_security_event(
            "api_key_authentication_failed",
            severity="warning",
            details={"key_prefix": api_key[:12] if len(api_key) > 12 else "unknown"}
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired API key",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return api_key_data


def require_permissions(required_permissions: List[str]) -> Callable:
    """
    Dependency factory that creates a permission checker.
    
    Args:
        required_permissions: List of required permissions
        
    Returns:
        Dependency function that validates permissions
    """
    def permission_checker(
        api_key_data: dict = Depends(require_api_key)
    ) -> dict:
        """
        Check if API key has required permissions.
        """
        # Check permissions
        user_permissions = set(api_key_data.get("permissions", []))
        required_permissions_set = set(required_permissions)
        
        # Check for wildcard permissions
        if "*" in user_permissions or "admin:*" in user_permissions:
            return api_key_data
        
        # Check specific permissions
        if not required_permissions_set.issubset(user_permissions):
            # Check for category wildcards
            missing_permissions = required_permissions_set - user_permissions
            
            for missing_perm in list(missing_permissions):
                # Check if there's a wildcard for this category
                perm_parts = missing_perm.split(":")
                if len(perm_parts) == 2:
                    category_wildcard = f"{perm_parts[0]}:*"
                    if category_wildcard in user_permissions:
                        missing_permissions.remove(missing_perm)
            
            # If there are still missing permissions, deny access
            if missing_permissions:
                # Log authorization failure
                audit_logger.log_security_event(
                    "api_key_authorization_failed",
                    severity="warning",
                    details={
                        "key_id": api_key_data.get("id"),
                        "required_permissions": required_permissions,
                        "missing_permissions": list(missing_permissions),
                        "user_permissions": list(user_permissions)
                    }
                )
                
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {', '.join(missing_permissions)}"
                )
        
        return api_key_data
    
    return permission_checker


def require_role(required_roles: List[str]) -> Callable:
    """
    Dependency factory that creates a role checker.
    
    Args:
        required_roles: List of required user roles
        
    Returns:
        Dependency function that validates roles
    """
    def role_checker(
        api_key_data: dict = Depends(require_api_key),
        db: Session = Depends(get_db)
    ) -> dict:
        """
        Check if API key owner has required role.
        """
        from models import User
        
        # Get user information
        user = db.query(User).filter(User.id == api_key_data["user_id"]).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key owner not found"
            )
        
        if user.role not in required_roles:
            # Log authorization failure
            audit_logger.log_security_event(
                "api_key_role_authorization_failed",
                severity="warning",
                details={
                    "key_id": api_key_data.get("id"),
                    "user_id": user.id,
                    "user_role": user.role,
                    "required_roles": required_roles
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {', '.join(required_roles)}"
            )
        
        return api_key_data
    
    return role_checker


def rate_limit_by_api_key(
    requests_per_minute: int = 60,
    requests_per_hour: int = 1000,
    requests_per_day: int = 10000
) -> Callable:
    """
    Rate limiter based on API key usage.
    
    Args:
        requests_per_minute: Request limit per minute
        requests_per_hour: Request limit per hour  
        requests_per_day: Request limit per day
        
    Returns:
        Dependency function that enforces rate limits
    """
    def rate_limiter(
        api_key_data: dict = Depends(require_api_key)
    ) -> dict:
        """
        Check rate limits for API key.
        """
        # TODO: Implement Redis-based rate limiting
        # For now, this is a placeholder that always passes
        
        # In a real implementation, you would:
        # 1. Check current usage from Redis counters
        # 2. Compare against limits
        # 3. Raise HTTP 429 if limits exceeded
        # 4. Update counters for this request
        
        return api_key_data
    
    return rate_limiter


class APIKeyScope:
    """
    Common permission scopes for API keys.
    """
    # Appointment permissions
    APPOINTMENTS_READ = "appointments:read"
    APPOINTMENTS_WRITE = "appointments:write"
    APPOINTMENTS_DELETE = "appointments:delete"
    
    # Client permissions
    CLIENTS_READ = "clients:read"
    CLIENTS_WRITE = "clients:write"
    CLIENTS_DELETE = "clients:delete"
    
    # Service permissions
    SERVICES_READ = "services:read"
    SERVICES_WRITE = "services:write"
    SERVICES_DELETE = "services:delete"
    
    # Payment permissions
    PAYMENTS_READ = "payments:read"
    PAYMENTS_WRITE = "payments:write"
    PAYMENTS_REFUND = "payments:refund"
    
    # Analytics permissions
    ANALYTICS_READ = "analytics:read"
    REPORTS_READ = "reports:read"
    REPORTS_EXPORT = "reports:export"
    
    # Integration permissions
    INTEGRATIONS_READ = "integrations:read"
    INTEGRATIONS_WRITE = "integrations:write"
    INTEGRATIONS_SYNC = "integrations:sync"
    
    # Webhook permissions
    WEBHOOK_RECEIVE = "webhook:receive"
    WEBHOOK_SEND = "webhook:send"
    
    # Admin permissions
    ADMIN_USERS = "admin:users"
    ADMIN_SETTINGS = "admin:settings"
    ADMIN_API_KEYS = "admin:api_keys"
    
    # Wildcard permissions
    ALL_PERMISSIONS = "*"
    ADMIN_ALL = "admin:*"
    
    @classmethod
    def get_default_permissions_by_type(cls, api_key_type: str) -> List[str]:
        """
        Get default permissions for different API key types.
        """
        permission_sets = {
            "integration": [
                cls.APPOINTMENTS_READ,
                cls.APPOINTMENTS_WRITE,
                cls.CLIENTS_READ,
                cls.CLIENTS_WRITE,
                cls.SERVICES_READ,
                cls.WEBHOOK_RECEIVE
            ],
            "partner": [
                cls.APPOINTMENTS_READ,
                cls.CLIENTS_READ,
                cls.SERVICES_READ,
                cls.ANALYTICS_READ,
                cls.REPORTS_READ
            ],
            "webhook": [
                cls.WEBHOOK_RECEIVE
            ],
            "internal": [
                cls.ALL_PERMISSIONS
            ],
            "test": [
                cls.APPOINTMENTS_READ,
                cls.CLIENTS_READ,
                cls.SERVICES_READ
            ]
        }
        
        return permission_sets.get(api_key_type, [])
    
    @classmethod
    def get_all_permissions(cls) -> List[str]:
        """
        Get all available permissions.
        """
        return [
            # Appointments
            cls.APPOINTMENTS_READ,
            cls.APPOINTMENTS_WRITE,
            cls.APPOINTMENTS_DELETE,
            # Clients
            cls.CLIENTS_READ,
            cls.CLIENTS_WRITE,
            cls.CLIENTS_DELETE,
            # Services
            cls.SERVICES_READ,
            cls.SERVICES_WRITE,
            cls.SERVICES_DELETE,
            # Payments
            cls.PAYMENTS_READ,
            cls.PAYMENTS_WRITE,
            cls.PAYMENTS_REFUND,
            # Analytics
            cls.ANALYTICS_READ,
            cls.REPORTS_READ,
            cls.REPORTS_EXPORT,
            # Integrations
            cls.INTEGRATIONS_READ,
            cls.INTEGRATIONS_WRITE,
            cls.INTEGRATIONS_SYNC,
            # Webhooks
            cls.WEBHOOK_RECEIVE,
            cls.WEBHOOK_SEND,
            # Admin
            cls.ADMIN_USERS,
            cls.ADMIN_SETTINGS,
            cls.ADMIN_API_KEYS
        ]


# Convenience decorators for common permission combinations

def require_appointment_access(write: bool = False, delete: bool = False):
    """Require appointment access permissions."""
    permissions = [APIKeyScope.APPOINTMENTS_READ]
    if write:
        permissions.append(APIKeyScope.APPOINTMENTS_WRITE)
    if delete:
        permissions.append(APIKeyScope.APPOINTMENTS_DELETE)
    return require_permissions(permissions)


def require_client_access(write: bool = False, delete: bool = False):
    """Require client access permissions."""
    permissions = [APIKeyScope.CLIENTS_READ]
    if write:
        permissions.append(APIKeyScope.CLIENTS_WRITE)
    if delete:
        permissions.append(APIKeyScope.CLIENTS_DELETE)
    return require_permissions(permissions)


def require_admin_access():
    """Require admin permissions."""
    return require_permissions([APIKeyScope.ADMIN_ALL])