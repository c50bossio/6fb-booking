"""
Permission management utilities for organization-based access control.

This module provides decorators and functions for checking user permissions
within organizations, roles, and feature access.
"""

from functools import wraps
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Callable

from db import get_db
from models import User, UserOrganization, Organization
from models.organization import UserRole


def require_organization_permission(permission: str, organization_id_param: str = "organization_id"):
    """
    Decorator to require a specific permission within an organization.
    
    Args:
        permission: The permission to check (e.g., 'manage_billing', 'manage_staff')
        organization_id_param: The parameter name that contains the organization ID
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract organization_id from kwargs
            organization_id = kwargs.get(organization_id_param)
            if not organization_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing {organization_id_param} parameter"
                )
            
            # Get current user and db session from dependencies
            current_user = None
            db = None
            
            # Find current_user and db in the function's dependencies
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif hasattr(value, 'query'):  # Check if it's a SQLAlchemy Session
                    db = value
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Internal error: missing user or database session"
                )
            
            # Check if user has permission
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == organization_id
            ).first()
            
            if not user_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this organization"
                )
            
            if not user_org.has_permission(permission) and current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(roles: List[str], organization_id_param: str = "organization_id"):
    """
    Decorator to require specific roles within an organization.
    
    Args:
        roles: List of acceptable roles (e.g., ['owner', 'manager'])
        organization_id_param: The parameter name that contains the organization ID
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            organization_id = kwargs.get(organization_id_param)
            if not organization_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing {organization_id_param} parameter"
                )
            
            # Get dependencies
            current_user = None
            db = None
            
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif hasattr(value, 'query'):
                    db = value
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Internal error: missing user or database session"
                )
            
            # Check role
            user_org = db.query(UserOrganization).filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == organization_id
            ).first()
            
            if not user_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this organization"
                )
            
            if user_org.role not in roles and current_user.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role must be one of: {', '.join(roles)}"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def check_organization_access(
    user_id: int, 
    organization_id: int, 
    db: Session,
    required_permission: Optional[str] = None
) -> UserOrganization:
    """
    Check if a user has access to an organization and optionally a specific permission.
    
    Args:
        user_id: The user's ID
        organization_id: The organization's ID
        db: Database session
        required_permission: Optional permission to check
        
    Returns:
        UserOrganization: The user-organization relationship
        
    Raises:
        HTTPException: If access is denied
    """
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user_id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this organization"
        )
    
    if required_permission and not user_org.has_permission(required_permission):
        # Check if user is admin (admins bypass organization permissions)
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{required_permission}' required"
            )
    
    return user_org


def check_feature_access(
    organization: Organization,
    feature: str,
    raise_exception: bool = True
) -> bool:
    """
    Check if an organization has access to a specific feature based on their billing plan.
    
    Args:
        organization: The organization to check
        feature: The feature name to check
        raise_exception: Whether to raise an exception if access is denied
        
    Returns:
        bool: True if access is granted
        
    Raises:
        HTTPException: If access is denied and raise_exception is True
    """
    enabled_features = organization.enabled_features
    
    if feature not in enabled_features or not enabled_features[feature]:
        if raise_exception:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature}' not available on current billing plan"
            )
        return False
    
    return True


def check_staff_limit(
    organization: Organization,
    current_staff_count: int,
    raise_exception: bool = True
) -> bool:
    """
    Check if an organization has reached their staff limit.
    
    Args:
        organization: The organization to check
        current_staff_count: Current number of staff members
        raise_exception: Whether to raise an exception if limit is reached
        
    Returns:
        bool: True if under limit
        
    Raises:
        HTTPException: If limit is reached and raise_exception is True
    """
    enabled_features = organization.enabled_features
    max_staff = enabled_features.get('max_staff')
    
    if max_staff is not None and current_staff_count >= max_staff:
        if raise_exception:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Staff limit of {max_staff} reached for current billing plan"
            )
        return False
    
    return True


def get_user_organizations(
    user_id: int,
    db: Session,
    role_filter: Optional[List[str]] = None,
    active_only: bool = True
) -> List[UserOrganization]:
    """
    Get all organizations a user belongs to, optionally filtered by role.
    
    Args:
        user_id: The user's ID
        db: Database session
        role_filter: Optional list of roles to filter by
        active_only: Whether to only return active organizations
        
    Returns:
        List[UserOrganization]: User's organization relationships
    """
    query = db.query(UserOrganization).filter(UserOrganization.user_id == user_id)
    
    if role_filter:
        query = query.filter(UserOrganization.role.in_(role_filter))
    
    if active_only:
        query = query.join(Organization).filter(Organization.is_active == True)
    
    return query.all()


def get_organization_hierarchy(
    organization_id: int,
    db: Session,
    include_parent: bool = True,
    include_children: bool = True
) -> dict:
    """
    Get the organization hierarchy (parent and children).
    
    Args:
        organization_id: The organization's ID
        db: Database session
        include_parent: Whether to include parent organization
        include_children: Whether to include child organizations
        
    Returns:
        dict: Organization hierarchy information
    """
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    result = {
        "organization": organization,
        "parent": None,
        "children": []
    }
    
    if include_parent and organization.parent_organization_id:
        result["parent"] = db.query(Organization).filter(
            Organization.id == organization.parent_organization_id
        ).first()
    
    if include_children:
        result["children"] = db.query(Organization).filter(
            Organization.parent_organization_id == organization_id,
            Organization.is_active == True
        ).all()
    
    return result


class OrganizationPermissions:
    """
    Class to encapsulate organization permission checking logic.
    """
    
    def __init__(self, user: User, organization_id: int, db: Session):
        self.user = user
        self.organization_id = organization_id
        self.db = db
        self._user_org = None
        self._organization = None
    
    @property
    def user_org(self) -> Optional[UserOrganization]:
        """Lazy load user-organization relationship"""
        if self._user_org is None:
            self._user_org = self.db.query(UserOrganization).filter(
                UserOrganization.user_id == self.user.id,
                UserOrganization.organization_id == self.organization_id
            ).first()
        return self._user_org
    
    @property
    def organization(self) -> Optional[Organization]:
        """Lazy load organization"""
        if self._organization is None:
            self._organization = self.db.query(Organization).filter(
                Organization.id == self.organization_id
            ).first()
        return self._organization
    
    def has_access(self) -> bool:
        """Check if user has any access to the organization"""
        return self.user_org is not None or self.user.role == "admin"
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission"""
        if self.user.role == "admin":
            return True
        
        if not self.user_org:
            return False
        
        return self.user_org.has_permission(permission)
    
    def has_role(self, roles: List[str]) -> bool:
        """Check if user has one of the specified roles"""
        if self.user.role == "admin":
            return True
        
        if not self.user_org:
            return False
        
        return self.user_org.role in roles
    
    def can_access_feature(self, feature: str) -> bool:
        """Check if organization has access to a feature"""
        if not self.organization:
            return False
        
        return check_feature_access(self.organization, feature, raise_exception=False)
    
    def require_access(self) -> None:
        """Require access, raise exception if denied"""
        if not self.has_access():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this organization"
            )
    
    def require_permission(self, permission: str) -> None:
        """Require permission, raise exception if denied"""
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
    
    def require_role(self, roles: List[str]) -> None:
        """Require role, raise exception if denied"""
        if not self.has_role(roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role must be one of: {', '.join(roles)}"
            )
    
    def require_feature(self, feature: str) -> None:
        """Require feature access, raise exception if denied"""
        if not self.can_access_feature(feature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature}' not available on current billing plan"
            )