"""
Authorization decorators for endpoint protection
"""
from functools import wraps
from typing import List, Optional, Union
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from api.v1.auth import get_current_user
from models.user import User


def require_role(allowed_roles: Union[str, List[str]]):
    """
    Decorator to require specific role(s) for endpoint access
    
    Usage:
        @router.get("/admin-only")
        @require_role("admin")
        async def admin_endpoint(current_user: User = Depends(get_current_active_user)):
            return {"message": "Admin access granted"}
        
        @router.get("/multi-role")
        @require_role(["admin", "mentor"])
        async def multi_role_endpoint(current_user: User = Depends(get_current_active_user)):
            return {"message": "Access granted"}
    """
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = kwargs.get('current_user')
            
            if not current_user:
                # Try to find it in args (for different function signatures)
                for arg in args:
                    if isinstance(arg, User):
                        current_user = arg
                        break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Super admin can access everything
            if current_user.role == "super_admin":
                return await func(*args, **kwargs)
            
            # Check if user has required role
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access forbidden. Required role(s): {', '.join(allowed_roles)}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_permissions(permissions: Union[str, List[str]]):
    """
    Decorator to require specific permission(s) for endpoint access
    
    Usage:
        @router.post("/users")
        @require_permissions("users.create")
        async def create_user(current_user: User = Depends(get_current_active_user)):
            return {"message": "User created"}
            
        @router.post("/admin")
        @require_permissions(["users.create", "users.delete"])
        async def admin_action(current_user: User = Depends(get_current_active_user)):
            return {"message": "Admin action"}
    """
    if isinstance(permissions, str):
        permissions = [permissions]
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = kwargs.get('current_user')
            
            if not current_user:
                # Try to find it in args
                for arg in args:
                    if isinstance(arg, User):
                        current_user = arg
                        break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Super admin has all permissions
            if current_user.role == "super_admin":
                return await func(*args, **kwargs)
            
            # Check if user has all required permissions
            user_permissions = current_user.permissions or []
            missing_permissions = [p for p in permissions if p not in user_permissions]
            
            if missing_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access forbidden. Required permission(s): {', '.join(missing_permissions)}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_permission(permission: str):
    """
    Decorator to require specific permission for endpoint access
    
    Usage:
        @router.post("/users")
        @require_permission("users.create")
        async def create_user(current_user: User = Depends(get_current_active_user)):
            return {"message": "User created"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = kwargs.get('current_user')
            
            if not current_user:
                # Try to find it in args
                for arg in args:
                    if isinstance(arg, User):
                        current_user = arg
                        break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Super admin has all permissions
            if current_user.role == "super_admin":
                return await func(*args, **kwargs)
            
            # Check if user has required permission
            if not current_user.permissions or permission not in current_user.permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access forbidden. Required permission: {permission}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_location_access(location_param: str = "location_id"):
    """
    Decorator to ensure user has access to the specified location
    
    Usage:
        @router.get("/locations/{location_id}/data")
        @require_location_access()
        async def get_location_data(
            location_id: int,
            current_user: User = Depends(get_current_active_user)
        ):
            return {"message": "Location data"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user and location_id from kwargs
            current_user = kwargs.get('current_user')
            location_id = kwargs.get(location_param)
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not location_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Location ID required"
                )
            
            # Super admin and admin can access all locations
            if current_user.role in ["super_admin", "admin"]:
                return await func(*args, **kwargs)
            
            # Check if user has access to this location
            if current_user.primary_location_id != location_id:
                # Check accessible_locations (JSON field)
                accessible = current_user.accessible_locations or []
                if location_id not in accessible:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access forbidden for this location"
                    )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_self_or_role(allowed_roles: List[str], user_param: str = "user_id"):
    """
    Decorator to allow access to own resources or with specific roles
    
    Usage:
        @router.get("/users/{user_id}/profile")
        @require_self_or_role(["admin"])
        async def get_user_profile(
            user_id: int,
            current_user: User = Depends(get_current_active_user)
        ):
            return {"message": "User profile"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            target_user_id = kwargs.get(user_param)
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Allow if accessing own resource
            if target_user_id and current_user.id == target_user_id:
                return await func(*args, **kwargs)
            
            # Allow if has required role
            if current_user.role in allowed_roles or current_user.role == "super_admin":
                return await func(*args, **kwargs)
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden"
            )
        
        return wrapper
    return decorator