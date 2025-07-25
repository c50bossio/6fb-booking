"""
Role-based permissions system for BookedBarber V2.

This module defines permissions for each role and provides utilities
for checking permissions throughout the application.
"""

from enum import Enum
from typing import Set, List, Optional, Dict, Any
from functools import wraps
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import User, UserOrganization, UnifiedUserRole
from dependencies import get_current_user
from db import get_db


class Permission(Enum):
    """All available permissions in the system"""
    
    # Appointment permissions
    VIEW_OWN_APPOINTMENTS = "view_own_appointments"
    VIEW_ALL_APPOINTMENTS = "view_all_appointments"
    CREATE_APPOINTMENTS = "create_appointments"
    UPDATE_APPOINTMENTS = "update_appointments"
    DELETE_APPOINTMENTS = "delete_appointments"
    
    # Client permissions
    VIEW_OWN_CLIENT_INFO = "view_own_client_info"
    VIEW_ALL_CLIENTS = "view_all_clients"
    CREATE_CLIENTS = "create_clients"
    UPDATE_CLIENTS = "update_clients"
    DELETE_CLIENTS = "delete_clients"
    
    # Staff management permissions
    VIEW_STAFF = "view_staff"
    INVITE_STAFF = "invite_staff"
    MANAGE_STAFF = "manage_staff"
    DELETE_STAFF = "delete_staff"
    
    # Billing permissions
    VIEW_BILLING = "view_billing"
    MANAGE_BILLING = "manage_billing"
    UPDATE_SUBSCRIPTION = "update_subscription"
    CANCEL_SUBSCRIPTION = "cancel_subscription"
    
    # Analytics permissions
    VIEW_BASIC_ANALYTICS = "view_basic_analytics"
    VIEW_ADVANCED_ANALYTICS = "view_advanced_analytics"
    VIEW_FINANCIAL_ANALYTICS = "view_financial_analytics"
    EXPORT_ANALYTICS = "export_analytics"
    
    # Service management
    VIEW_SERVICES = "view_services"
    CREATE_SERVICES = "create_services"
    UPDATE_SERVICES = "update_services"
    DELETE_SERVICES = "delete_services"
    
    # Marketing permissions
    VIEW_MARKETING = "view_marketing"
    CREATE_CAMPAIGNS = "create_campaigns"
    SEND_MARKETING = "send_marketing"
    MANAGE_CONTACTS = "manage_contacts"
    
    # Settings permissions
    VIEW_SETTINGS = "view_settings"
    UPDATE_SETTINGS = "update_settings"
    MANAGE_INTEGRATIONS = "manage_integrations"
    
    # Organization permissions
    VIEW_ORGANIZATION = "view_organization"
    UPDATE_ORGANIZATION = "update_organization"
    DELETE_ORGANIZATION = "delete_organization"
    MANAGE_LOCATIONS = "manage_locations"
    
    # System admin permissions
    SYSTEM_ADMIN = "system_admin"
    VIEW_ALL_ORGANIZATIONS = "view_all_organizations"
    IMPERSONATE_USERS = "impersonate_users"
    MANAGE_PLATFORM = "manage_platform"


# Role-Permission Mapping
ROLE_PERMISSIONS: Dict[str, Set[Permission]] = {
    # Platform roles
    UnifiedUserRole.SUPER_ADMIN.value: set(Permission),  # All permissions
    
    UnifiedUserRole.PLATFORM_ADMIN.value: {
        Permission.SYSTEM_ADMIN,
        Permission.VIEW_ALL_ORGANIZATIONS,
        Permission.MANAGE_PLATFORM,
        Permission.VIEW_FINANCIAL_ANALYTICS,
        Permission.EXPORT_ANALYTICS,
    },
    
    # Business owner roles
    UnifiedUserRole.ENTERPRISE_OWNER.value: {
        # Full access to everything except system admin
        Permission.VIEW_ALL_APPOINTMENTS,
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,
        Permission.DELETE_APPOINTMENTS,
        Permission.VIEW_ALL_CLIENTS,
        Permission.CREATE_CLIENTS,
        Permission.UPDATE_CLIENTS,
        Permission.DELETE_CLIENTS,
        Permission.VIEW_STAFF,
        Permission.INVITE_STAFF,
        Permission.MANAGE_STAFF,
        Permission.DELETE_STAFF,
        Permission.VIEW_BILLING,
        Permission.MANAGE_BILLING,
        Permission.UPDATE_SUBSCRIPTION,
        Permission.CANCEL_SUBSCRIPTION,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_ADVANCED_ANALYTICS,
        Permission.VIEW_FINANCIAL_ANALYTICS,
        Permission.EXPORT_ANALYTICS,
        Permission.VIEW_SERVICES,
        Permission.CREATE_SERVICES,
        Permission.UPDATE_SERVICES,
        Permission.DELETE_SERVICES,
        Permission.VIEW_MARKETING,
        Permission.CREATE_CAMPAIGNS,
        Permission.SEND_MARKETING,
        Permission.MANAGE_CONTACTS,
        Permission.VIEW_SETTINGS,
        Permission.UPDATE_SETTINGS,
        Permission.MANAGE_INTEGRATIONS,
        Permission.VIEW_ORGANIZATION,
        Permission.UPDATE_ORGANIZATION,
        Permission.DELETE_ORGANIZATION,
        Permission.MANAGE_LOCATIONS,
        Permission.VIEW_ALL_ORGANIZATIONS,  # For their enterprise
    },
    
    UnifiedUserRole.SHOP_OWNER.value: {
        # Same as enterprise owner but limited to their shop
        Permission.VIEW_ALL_APPOINTMENTS,
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,
        Permission.DELETE_APPOINTMENTS,
        Permission.VIEW_ALL_CLIENTS,
        Permission.CREATE_CLIENTS,
        Permission.UPDATE_CLIENTS,
        Permission.DELETE_CLIENTS,
        Permission.VIEW_STAFF,
        Permission.INVITE_STAFF,
        Permission.MANAGE_STAFF,
        Permission.DELETE_STAFF,
        Permission.VIEW_BILLING,
        Permission.MANAGE_BILLING,
        Permission.UPDATE_SUBSCRIPTION,
        Permission.CANCEL_SUBSCRIPTION,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_ADVANCED_ANALYTICS,
        Permission.VIEW_FINANCIAL_ANALYTICS,
        Permission.EXPORT_ANALYTICS,
        Permission.VIEW_SERVICES,
        Permission.CREATE_SERVICES,
        Permission.UPDATE_SERVICES,
        Permission.DELETE_SERVICES,
        Permission.VIEW_MARKETING,
        Permission.CREATE_CAMPAIGNS,
        Permission.SEND_MARKETING,
        Permission.MANAGE_CONTACTS,
        Permission.VIEW_SETTINGS,
        Permission.UPDATE_SETTINGS,
        Permission.MANAGE_INTEGRATIONS,
        Permission.VIEW_ORGANIZATION,
        Permission.UPDATE_ORGANIZATION,
    },
    
    UnifiedUserRole.INDIVIDUAL_BARBER.value: {
        # Barber running their own business
        Permission.VIEW_ALL_APPOINTMENTS,  # Their appointments
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,
        Permission.DELETE_APPOINTMENTS,
        Permission.VIEW_ALL_CLIENTS,  # Their clients
        Permission.CREATE_CLIENTS,
        Permission.UPDATE_CLIENTS,
        Permission.VIEW_BILLING,
        Permission.UPDATE_SUBSCRIPTION,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_FINANCIAL_ANALYTICS,  # Their own earnings
        Permission.VIEW_SERVICES,
        Permission.CREATE_SERVICES,
        Permission.UPDATE_SERVICES,
        Permission.VIEW_SETTINGS,
        Permission.UPDATE_SETTINGS,
        Permission.MANAGE_INTEGRATIONS,
    },
    
    # Staff roles
    UnifiedUserRole.SHOP_MANAGER.value: {
        Permission.VIEW_ALL_APPOINTMENTS,
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,
        Permission.DELETE_APPOINTMENTS,
        Permission.VIEW_ALL_CLIENTS,
        Permission.CREATE_CLIENTS,
        Permission.UPDATE_CLIENTS,
        Permission.VIEW_STAFF,
        Permission.INVITE_STAFF,
        Permission.MANAGE_STAFF,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_ADVANCED_ANALYTICS,
        Permission.VIEW_SERVICES,
        Permission.CREATE_SERVICES,
        Permission.UPDATE_SERVICES,
        Permission.VIEW_MARKETING,
        Permission.CREATE_CAMPAIGNS,
        Permission.VIEW_SETTINGS,
        Permission.UPDATE_SETTINGS,
        Permission.VIEW_ORGANIZATION,
    },
    
    UnifiedUserRole.BARBER.value: {
        Permission.VIEW_OWN_APPOINTMENTS,
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,
        Permission.VIEW_ALL_CLIENTS,  # Need to see client info
        Permission.CREATE_CLIENTS,
        Permission.UPDATE_CLIENTS,
        Permission.VIEW_BASIC_ANALYTICS,  # Their own stats
        Permission.VIEW_SERVICES,
        Permission.VIEW_SETTINGS,
    },
    
    UnifiedUserRole.RECEPTIONIST.value: {
        Permission.VIEW_ALL_APPOINTMENTS,
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,
        Permission.VIEW_ALL_CLIENTS,
        Permission.CREATE_CLIENTS,
        Permission.UPDATE_CLIENTS,
        Permission.VIEW_SERVICES,
        Permission.VIEW_SETTINGS,
    },
    
    # Client role
    UnifiedUserRole.CLIENT.value: {
        Permission.VIEW_OWN_APPOINTMENTS,
        Permission.CREATE_APPOINTMENTS,
        Permission.UPDATE_APPOINTMENTS,  # Can reschedule their own
        Permission.VIEW_OWN_CLIENT_INFO,
        Permission.VIEW_SERVICES,
    },
    
    # Limited access
    UnifiedUserRole.VIEWER.value: {
        Permission.VIEW_OWN_APPOINTMENTS,
        Permission.VIEW_OWN_CLIENT_INFO,
        Permission.VIEW_SERVICES,
    },
}


class PermissionChecker:
    """Utility class for checking permissions"""
    
    def __init__(self, user: User, db: Session, organization_id: Optional[int] = None):
        self.user = user
        self.db = db
        self.organization_id = organization_id
        self._permissions_cache: Optional[Set[Permission]] = None
        self._org_role_cache: Optional[str] = None
    
    @property
    def user_permissions(self) -> Set[Permission]:
        """Get all permissions for the current user"""
        if self._permissions_cache is not None:
            return self._permissions_cache
        
        # Get base permissions from unified role
        base_permissions = ROLE_PERMISSIONS.get(self.user.unified_role, set())
        
        # If checking within an organization context
        if self.organization_id:
            org_role = self.get_organization_role()
            if org_role:
                # Check if user has specific permissions in this organization
                user_org = self.db.query(UserOrganization).filter(
                    UserOrganization.user_id == self.user.id,
                    UserOrganization.organization_id == self.organization_id
                ).first()
                
                if user_org:
                    # Add organization-specific permissions
                    if user_org.can_manage_billing:
                        base_permissions = base_permissions | {
                            Permission.VIEW_BILLING,
                            Permission.MANAGE_BILLING,
                            Permission.UPDATE_SUBSCRIPTION
                        }
                    
                    if user_org.can_manage_staff:
                        base_permissions = base_permissions | {
                            Permission.VIEW_STAFF,
                            Permission.INVITE_STAFF,
                            Permission.MANAGE_STAFF
                        }
                    
                    if user_org.can_view_analytics:
                        base_permissions = base_permissions | {
                            Permission.VIEW_BASIC_ANALYTICS
                        }
        
        self._permissions_cache = base_permissions
        return base_permissions
    
    def get_organization_role(self) -> Optional[str]:
        """Get user's role in the current organization"""
        if not self.organization_id:
            return None
        
        if self._org_role_cache is not None:
            return self._org_role_cache
        
        self._org_role_cache = self.user.get_role_in_organization(self.organization_id)
        return self._org_role_cache
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if user has a specific permission"""
        return permission in self.user_permissions
    
    def has_any_permission(self, permissions: List[Permission]) -> bool:
        """Check if user has any of the specified permissions"""
        return any(self.has_permission(p) for p in permissions)
    
    def has_all_permissions(self, permissions: List[Permission]) -> bool:
        """Check if user has all of the specified permissions"""
        return all(self.has_permission(p) for p in permissions)
    
    def require_permission(self, permission: Permission) -> None:
        """Raise exception if user doesn't have permission"""
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have permission to perform this action"
            )
    
    def require_any_permission(self, permissions: List[Permission]) -> None:
        """Raise exception if user doesn't have any of the permissions"""
        if not self.has_any_permission(permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have permission to perform this action"
            )


# Dependency injection helpers
def get_permission_checker(
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PermissionChecker:
    """Get permission checker for the current request"""
    return PermissionChecker(current_user, db, organization_id)


# Decorator for protecting endpoints
def require_permission(permission: Permission):
    """Decorator to require a specific permission for an endpoint"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            checker = kwargs.get('permission_checker')
            if not checker:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Permission checker not found"
                )
            
            checker.require_permission(permission)
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_any_permission(*permissions: Permission):
    """Decorator to require any of the specified permissions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            checker = kwargs.get('permission_checker')
            if not checker:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Permission checker not found"
                )
            
            checker.require_any_permission(list(permissions))
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Helper functions for common permission checks
def can_manage_organization(user: User, organization_id: int, db: Session) -> bool:
    """Check if user can manage a specific organization"""
    checker = PermissionChecker(user, db, organization_id)
    return checker.has_any_permission([
        Permission.UPDATE_ORGANIZATION,
        Permission.MANAGE_STAFF,
        Permission.MANAGE_BILLING
    ])


def can_view_client_data(user: User, client_id: int, db: Session) -> bool:
    """Check if user can view a specific client's data"""
    # If user is the client themselves
    if user.id == client_id:
        return True
    
    # Otherwise check permissions
    checker = PermissionChecker(user, db)
    return checker.has_permission(Permission.VIEW_ALL_CLIENTS)


def can_modify_appointment(user: User, appointment: Any, db: Session) -> bool:
    """Check if user can modify a specific appointment"""
    # If user is the client
    if appointment.client_id == user.id:
        checker = PermissionChecker(user, db)
        return checker.has_permission(Permission.UPDATE_APPOINTMENTS)
    
    # If user is the barber
    if appointment.barber_id == user.id:
        checker = PermissionChecker(user, db)
        return checker.has_permission(Permission.UPDATE_APPOINTMENTS)
    
    # Otherwise need general permission
    checker = PermissionChecker(user, db)
    return checker.has_permission(Permission.VIEW_ALL_APPOINTMENTS) and \
           checker.has_permission(Permission.UPDATE_APPOINTMENTS)