"""
Security and access control decorators for PCI DSS and compliance endpoints.

Provides decorators for:
- Financial endpoint security (PCI DSS compliance)
- Admin access control
- Audit trail logging
- Rate limiting for sensitive operations
"""

from functools import wraps
from typing import Callable, Any
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models import User
from dependencies import get_current_user


def financial_endpoint_security(func: Callable) -> Callable:
    """
    Decorator for financial endpoints requiring enhanced security.
    
    Enforces:
    - Authentication required
    - Role-based access (admin, shop_manager, platform_admin)
    - Audit logging
    - Rate limiting
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract request and user from kwargs
        request: Request = kwargs.get('request')
        current_user: User = kwargs.get('current_user')
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for financial operations"
            )
        
        # Check role permissions for financial data access
        allowed_roles = {
            "platform_admin", "shop_manager", "shop_owner", "enterprise_owner"
        }
        
        if current_user.unified_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for financial operations"
            )
        
        # Log financial endpoint access
        if request:
            from services.pci_compliance import pci_compliance_service
            pci_compliance_service._log_security_event(
                event_type="financial_endpoint_access",
                severity="medium",
                details={
                    "endpoint": request.url.path,
                    "method": request.method,
                    "user_role": current_user.unified_role
                },
                user_id=str(current_user.id),
                ip_address=request.client.host if request.client else None
            )
        
        # Call the original function
        return await func(*args, **kwargs)
    
    return wrapper


def admin_required(func: Callable) -> Callable:
    """
    Decorator requiring platform admin or shop manager access.
    
    Enforces strict access control for administrative functions.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        current_user: User = kwargs.get('current_user')
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Only platform admins and shop managers can access
        admin_roles = {"platform_admin", "shop_manager"}
        
        if current_user.unified_role not in admin_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator privileges required"
            )
        
        return await func(*args, **kwargs)
    
    return wrapper


def audit_trail(operation_type: str, resource_type: str = None):
    """
    Decorator for creating audit trails of sensitive operations.
    
    Args:
        operation_type: Type of operation (create, read, update, delete)
        resource_type: Type of resource being accessed
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get('request')
            current_user: User = kwargs.get('current_user')
            
            # Log operation start
            from services.pci_compliance import pci_compliance_service
            
            audit_details = {
                "operation_type": operation_type,
                "resource_type": resource_type or "unknown",
                "function_name": func.__name__,
                "start_time": str(__import__('datetime').datetime.utcnow())
            }
            
            if request:
                audit_details.update({
                    "endpoint": request.url.path,
                    "method": request.method,
                    "query_params": str(request.query_params)
                })
            
            pci_compliance_service._log_security_event(
                event_type="audit_operation_start",
                severity="low",
                details=audit_details,
                user_id=str(current_user.id) if current_user else None,
                ip_address=request.client.host if request and request.client else None
            )
            
            try:
                # Execute the function
                result = await func(*args, **kwargs)
                
                # Log successful completion
                pci_compliance_service._log_security_event(
                    event_type="audit_operation_success",
                    severity="low",
                    details={
                        **audit_details,
                        "end_time": str(__import__('datetime').datetime.utcnow()),
                        "status": "success"
                    },
                    user_id=str(current_user.id) if current_user else None,
                    ip_address=request.client.host if request and request.client else None
                )
                
                return result
                
            except Exception as e:
                # Log operation failure
                pci_compliance_service._log_security_event(
                    event_type="audit_operation_error",
                    severity="high",
                    details={
                        **audit_details,
                        "end_time": str(__import__('datetime').datetime.utcnow()),
                        "status": "error",
                        "error": str(e),
                        "error_type": type(e).__name__
                    },
                    user_id=str(current_user.id) if current_user else None,
                    ip_address=request.client.host if request and request.client else None
                )
                
                raise
        
        return wrapper
    return decorator


def compliance_rate_limit(requests_per_minute: int = 10):
    """
    Decorator for rate limiting compliance-related endpoints.
    
    Args:
        requests_per_minute: Maximum requests allowed per minute per user
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user: User = kwargs.get('current_user')
            request: Request = kwargs.get('request')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for rate limiting"
                )
            
            # Simple in-memory rate limiting (in production, use Redis)
            import time
            from collections import defaultdict
            
            if not hasattr(wrapper, '_rate_limit_store'):
                wrapper._rate_limit_store = defaultdict(list)
            
            user_key = f"compliance_{current_user.id}"
            current_time = time.time()
            
            # Clean old entries
            wrapper._rate_limit_store[user_key] = [
                timestamp for timestamp in wrapper._rate_limit_store[user_key]
                if current_time - timestamp < 60  # Last minute
            ]
            
            # Check rate limit
            if len(wrapper._rate_limit_store[user_key]) >= requests_per_minute:
                from services.pci_compliance import pci_compliance_service
                pci_compliance_service._log_security_event(
                    event_type="rate_limit_exceeded",
                    severity="medium",
                    details={
                        "endpoint": request.url.path if request else "unknown",
                        "requests_in_window": len(wrapper._rate_limit_store[user_key]),
                        "limit": requests_per_minute
                    },
                    user_id=str(current_user.id),
                    ip_address=request.client.host if request and request.client else None
                )
                
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {requests_per_minute} requests per minute allowed."
                )
            
            # Record this request
            wrapper._rate_limit_store[user_key].append(current_time)
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def sensitive_data_access(data_classification: str):
    """
    Decorator for accessing sensitive data with proper controls.
    
    Args:
        data_classification: Classification level (cardholder_data, sad, metadata, public)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user: User = kwargs.get('current_user')
            request: Request = kwargs.get('request')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for sensitive data access"
                )
            
            # Validate access to sensitive data
            from services.pci_compliance import validate_pci_access
            
            has_access = validate_pci_access(
                str(current_user.id), 
                data_classification, 
                "read"
            )
            
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to {data_classification} data"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_mfa_for_compliance(func: Callable) -> Callable:
    """
    Decorator requiring MFA verification for compliance operations.
    
    High-security operations require additional verification.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        current_user: User = kwargs.get('current_user')
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Check if user has MFA enabled and verified
        # This would integrate with your MFA system
        if not getattr(current_user, 'mfa_verified', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Multi-factor authentication required for this operation"
            )
        
        return await func(*args, **kwargs)
    
    return wrapper


# Helper function for combining decorators
def secure_compliance_endpoint(
    require_admin: bool = False,
    data_classification: str = None,
    rate_limit: int = 10,
    audit_operation: str = None,
    audit_resource: str = None
):
    """
    Combines multiple security decorators for compliance endpoints.
    
    Args:
        require_admin: Whether admin privileges are required
        data_classification: Sensitive data classification level
        rate_limit: Requests per minute limit
        audit_operation: Audit trail operation type
        audit_resource: Audit trail resource type
    """
    def decorator(func: Callable) -> Callable:
        # Apply decorators in order
        decorated_func = func
        
        # Audit trail (outermost)
        if audit_operation:
            decorated_func = audit_trail(audit_operation, audit_resource)(decorated_func)
        
        # Rate limiting
        if rate_limit:
            decorated_func = compliance_rate_limit(rate_limit)(decorated_func)
        
        # Sensitive data access
        if data_classification:
            decorated_func = sensitive_data_access(data_classification)(decorated_func)
        
        # Admin requirement
        if require_admin:
            decorated_func = admin_required(decorated_func)
        
        # Financial endpoint security (innermost)
        decorated_func = financial_endpoint_security(decorated_func)
        
        return decorated_func
    
    return decorator