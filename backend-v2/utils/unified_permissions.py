"""
Unified permission system for role-based access control.

This module provides centralized permission checking for the new unified role system,
replacing the scattered role checking logic throughout the application.
"""

from functools import wraps
from typing import List, Optional, Callable, Any
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from models import User, UnifiedUserRole
from dependencies import get_current_user
from db import get_db


class PermissionError(HTTPException):
    """Custom exception for permission violations"""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class UnifiedPermissions:
    """
    Centralized permission checking system for unified user roles.
    
    Provides both decorator-based and function-based permission checking
    for API endpoints and business logic.
    """
    
    # Role hierarchy for permission inheritance
    ROLE_HIERARCHY = {
        UnifiedUserRole.SUPER_ADMIN: 100,
        UnifiedUserRole.PLATFORM_ADMIN: 90,
        UnifiedUserRole.ENTERPRISE_OWNER: 80,
        UnifiedUserRole.SHOP_OWNER: 70,
        UnifiedUserRole.INDIVIDUAL_BARBER: 60,
        UnifiedUserRole.SHOP_MANAGER: 50,
        UnifiedUserRole.BARBER: 40,
        UnifiedUserRole.RECEPTIONIST: 30,
        UnifiedUserRole.VIEWER: 20,
        UnifiedUserRole.CLIENT: 10
    }
    
    @classmethod
    def get_role_level(cls, role: str) -> int:
        """Get numeric level for role comparison"""
        try:
            role_enum = UnifiedUserRole(role)
            return cls.ROLE_HIERARCHY.get(role_enum, 0)
        except ValueError:
            return 0
    
    @classmethod
    def has_minimum_role(cls, user_role: str, required_role: str) -> bool:
        """Check if user role meets minimum requirement"""
        user_level = cls.get_role_level(user_role)
        required_level = cls.get_role_level(required_role)
        return user_level >= required_level
    
    @classmethod
    def can_manage_billing(cls, user: User) -> bool:
        """Check if user can access billing and subscription features"""
        return user.unified_role in [
            UnifiedUserRole.SUPER_ADMIN.value,
            UnifiedUserRole.PLATFORM_ADMIN.value,
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value,
            UnifiedUserRole.INDIVIDUAL_BARBER.value
        ]
    
    @classmethod
    def can_manage_staff(cls, user: User) -> bool:
        """Check if user can manage staff members and permissions"""
        return user.unified_role in [
            UnifiedUserRole.SUPER_ADMIN.value,
            UnifiedUserRole.PLATFORM_ADMIN.value,
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value,
            UnifiedUserRole.SHOP_MANAGER.value
        ]
    
    @classmethod
    def can_view_analytics(cls, user: User) -> bool:
        """Check if user can view business analytics and reports"""
        return user.unified_role in [
            UnifiedUserRole.SUPER_ADMIN.value,
            UnifiedUserRole.PLATFORM_ADMIN.value,
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value,
            UnifiedUserRole.INDIVIDUAL_BARBER.value,
            UnifiedUserRole.SHOP_MANAGER.value,
            UnifiedUserRole.BARBER.value
        ]
    
    @classmethod
    def can_manage_organizations(cls, user: User) -> bool:
        """Check if user can create and manage organizations"""
        return user.unified_role in [
            UnifiedUserRole.SUPER_ADMIN.value,
            UnifiedUserRole.PLATFORM_ADMIN.value,
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value
        ]
    
    @classmethod
    def can_book_appointments(cls, user: User) -> bool:
        """Check if user can book appointments (almost everyone)"""
        return user.unified_role not in [
            UnifiedUserRole.VIEWER.value  # Only viewers cannot book
        ]
    
    @classmethod
    def can_manage_appointments(cls, user: User) -> bool:
        """Check if user can manage appointments (staff and above)"""
        return user.unified_role in [
            UnifiedUserRole.SUPER_ADMIN.value,
            UnifiedUserRole.PLATFORM_ADMIN.value,
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value,
            UnifiedUserRole.INDIVIDUAL_BARBER.value,
            UnifiedUserRole.SHOP_MANAGER.value,
            UnifiedUserRole.BARBER.value,
            UnifiedUserRole.RECEPTIONIST.value
        ]
    
    @classmethod
    def can_process_payments(cls, user: User) -> bool:
        """Check if user can process payments and handle transactions"""
        return user.unified_role in [
            UnifiedUserRole.SUPER_ADMIN.value,
            UnifiedUserRole.PLATFORM_ADMIN.value,
            UnifiedUserRole.ENTERPRISE_OWNER.value,
            UnifiedUserRole.SHOP_OWNER.value,
            UnifiedUserRole.INDIVIDUAL_BARBER.value,
            UnifiedUserRole.SHOP_MANAGER.value,
            UnifiedUserRole.BARBER.value,
            UnifiedUserRole.RECEPTIONIST.value
        ]


def require_role(allowed_roles: List[str]):
    """
    Decorator to require specific roles for API endpoints.
    
    Usage:
        @require_role([UnifiedUserRole.SHOP_OWNER.value, UnifiedUserRole.ENTERPRISE_OWNER.value])
        async def manage_staff(current_user: User = Depends(get_current_user)):
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user from function parameters
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise PermissionError("Authentication required")
            
            if current_user.unified_role not in allowed_roles:
                raise PermissionError(
                    f"Role '{current_user.unified_role}' not authorized. Required: {allowed_roles}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_minimum_role(minimum_role: str):
    """
    Decorator to require minimum role level for API endpoints.
    
    Usage:
        @require_minimum_role(UnifiedUserRole.SHOP_MANAGER.value)
        async def view_reports(current_user: User = Depends(get_current_user)):
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user from function parameters
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise PermissionError("Authentication required")
            
            if not UnifiedPermissions.has_minimum_role(current_user.unified_role, minimum_role):
                raise PermissionError(
                    f"Insufficient role level. Minimum required: {minimum_role}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(permission_check: Callable[[User], bool], error_message: str = "Permission denied"):
    """
    Decorator to require custom permission check for API endpoints.
    
    Usage:
        @require_permission(UnifiedPermissions.can_manage_billing, "Billing access required")
        async def update_subscription(current_user: User = Depends(get_current_user)):
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user from function parameters
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise PermissionError("Authentication required")
            
            if not permission_check(current_user):
                raise PermissionError(error_message)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Convenience functions for common permission checks
def check_billing_permission(user: User) -> bool:
    """Check if user can access billing features"""
    return UnifiedPermissions.can_manage_billing(user)


def check_staff_management_permission(user: User) -> bool:
    """Check if user can manage staff"""
    return UnifiedPermissions.can_manage_staff(user)


def check_analytics_permission(user: User) -> bool:
    """Check if user can view analytics"""
    return UnifiedPermissions.can_view_analytics(user)


def check_organization_management_permission(user: User) -> bool:
    """Check if user can manage organizations"""
    return UnifiedPermissions.can_manage_organizations(user)


# Dependency functions for FastAPI
def require_billing_access(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency to require billing access"""
    if not check_billing_permission(current_user):
        raise PermissionError("Billing access required")
    return current_user


def require_staff_management(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency to require staff management permission"""
    if not check_staff_management_permission(current_user):
        raise PermissionError("Staff management permission required")
    return current_user


def require_analytics_access(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency to require analytics access"""
    if not check_analytics_permission(current_user):
        raise PermissionError("Analytics access required")
    return current_user


def require_organization_management(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency to require organization management permission"""
    if not check_organization_management_permission(current_user):
        raise PermissionError("Organization management permission required")
    return current_user


# Migration helper functions
def migrate_user_to_unified_role(user: User, db: Session) -> bool:
    """
    Migrate a user from legacy role system to unified role system.
    Returns True if migration was performed.
    """
    if user.migrate_from_legacy_roles():
        db.commit()
        return True
    return False


def migrate_all_users_to_unified_roles(db: Session) -> dict:
    """
    Migrate all users in database to unified role system.
    Returns summary of migration results.
    """
    from sqlalchemy import and_
    
    # Get all users that haven't been migrated
    users_to_migrate = db.query(User).filter(
        and_(User.role_migrated == False, User.is_active == True)
    ).all()
    
    migration_summary = {
        "total_users": len(users_to_migrate),
        "migrated": 0,
        "errors": []
    }
    
    for user in users_to_migrate:
        try:
            if migrate_user_to_unified_role(user, db):
                migration_summary["migrated"] += 1
        except Exception as e:
            migration_summary["errors"].append({
                "user_id": user.id,
                "email": user.email,
                "error": str(e)
            })
    
    return migration_summary