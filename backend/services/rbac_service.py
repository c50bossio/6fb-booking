"""
Role-Based Access Control (RBAC) Service
Manages user permissions, roles, and access control for the 6FB platform
"""

import logging
from typing import Dict, List, Any, Optional, Callable
from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from models.user import User, UserSession, UserActivity
from models.location import Location
from models.barber import Barber
from config.database import get_db

logger = logging.getLogger(__name__)


class Permission:
    """Permission constants"""

    # System Administration
    SYSTEM_ADMIN = "system:admin"
    MANAGE_PLATFORM = "system:manage_platform"
    VIEW_SYSTEM_LOGS = "system:view_logs"

    # User Management
    MANAGE_USERS = "users:manage"
    VIEW_ALL_USERS = "users:view_all"
    CREATE_USERS = "users:create"
    DELETE_USERS = "users:delete"
    ASSIGN_ROLES = "users:assign_roles"

    # Location Management
    MANAGE_ALL_LOCATIONS = "locations:manage_all"
    VIEW_ALL_LOCATIONS = "locations:view_all"
    CREATE_LOCATIONS = "locations:create"
    DELETE_LOCATIONS = "locations:delete"
    VIEW_ASSIGNED_LOCATIONS = "locations:view_assigned"
    MANAGE_ASSIGNED_LOCATIONS = "locations:manage_assigned"

    # Analytics and Reporting
    VIEW_ALL_ANALYTICS = "analytics:view_all"
    VIEW_LOCATION_ANALYTICS = "analytics:view_location"
    VIEW_OWN_ANALYTICS = "analytics:view_own"
    EXPORT_DATA = "analytics:export"
    VIEW_FINANCIAL_DATA = "analytics:financial"

    # Mentorship
    MANAGE_MENTEES = "mentorship:manage_mentees"
    VIEW_MENTEE_DATA = "mentorship:view_mentee_data"
    CREATE_GOALS = "mentorship:create_goals"
    MANAGE_TRAINING = "mentorship:manage_training"

    # Appointments and Clients
    MANAGE_ALL_APPOINTMENTS = "appointments:manage_all"
    MANAGE_LOCATION_APPOINTMENTS = "appointments:manage_location"
    MANAGE_OWN_APPOINTMENTS = "appointments:manage_own"
    VIEW_ALL_CLIENTS = "clients:view_all"
    VIEW_LOCATION_CLIENTS = "clients:view_location"
    VIEW_OWN_CLIENTS = "clients:view_own"

    # Automation
    MANAGE_AUTOMATION = "automation:manage"
    VIEW_AUTOMATION_LOGS = "automation:view_logs"
    CONFIGURE_WORKFLOWS = "automation:configure_workflows"

    # Financial
    VIEW_REVENUE_DATA = "financial:view_revenue"
    MANAGE_COMMISSIONS = "financial:manage_commissions"
    VIEW_PAYOUTS = "financial:view_payouts"
    MANAGE_PAYMENTS = "financial:manage_payments"
    VIEW_PAYMENTS = "financial:view_payments"

    # Product Management
    VIEW_PRODUCTS = "products:view"
    MANAGE_PRODUCTS = "products:manage"
    CREATE_PRODUCTS = "products:create"
    DELETE_PRODUCTS = "products:delete"
    VIEW_INVENTORY = "products:view_inventory"
    MANAGE_INVENTORY = "products:manage_inventory"

    # POS System
    USE_POS = "pos:use"
    MANAGE_POS = "pos:manage"
    PROCESS_SALES = "pos:process_sales"

    # Integrations
    MANAGE_INTEGRATIONS = "integrations:manage"
    VIEW_INTEGRATIONS = "integrations:view"
    CONFIGURE_SQUARE = "integrations:configure_square"
    CONFIGURE_SHOPIFY = "integrations:configure_shopify"


class Role:
    """Role definitions with default permissions"""

    SUPER_ADMIN = {
        "name": "super_admin",
        "display_name": "Super Administrator",
        "description": "Full system access and control",
        "permissions": [
            Permission.SYSTEM_ADMIN,
            Permission.MANAGE_PLATFORM,
            Permission.VIEW_SYSTEM_LOGS,
            Permission.MANAGE_USERS,
            Permission.VIEW_ALL_USERS,
            Permission.CREATE_USERS,
            Permission.DELETE_USERS,
            Permission.ASSIGN_ROLES,
            Permission.MANAGE_ALL_LOCATIONS,
            Permission.VIEW_ALL_LOCATIONS,
            Permission.CREATE_LOCATIONS,
            Permission.DELETE_LOCATIONS,
            Permission.VIEW_ALL_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.VIEW_FINANCIAL_DATA,
            Permission.MANAGE_AUTOMATION,
            Permission.VIEW_AUTOMATION_LOGS,
            Permission.CONFIGURE_WORKFLOWS,
            Permission.MANAGE_ALL_APPOINTMENTS,
            Permission.VIEW_ALL_CLIENTS,
            Permission.VIEW_REVENUE_DATA,
            Permission.MANAGE_COMMISSIONS,
            Permission.VIEW_PAYOUTS,
            Permission.MANAGE_PAYMENTS,
            Permission.VIEW_PAYMENTS,
            Permission.VIEW_PRODUCTS,
            Permission.MANAGE_PRODUCTS,
            Permission.CREATE_PRODUCTS,
            Permission.DELETE_PRODUCTS,
            Permission.VIEW_INVENTORY,
            Permission.MANAGE_INVENTORY,
            Permission.USE_POS,
            Permission.MANAGE_POS,
            Permission.PROCESS_SALES,
            Permission.MANAGE_INTEGRATIONS,
            Permission.VIEW_INTEGRATIONS,
            Permission.CONFIGURE_SQUARE,
            Permission.CONFIGURE_SHOPIFY,
        ],
    }

    ADMIN = {
        "name": "admin",
        "display_name": "Administrator",
        "description": "Business operations and management",
        "permissions": [
            Permission.MANAGE_USERS,
            Permission.VIEW_ALL_USERS,
            Permission.CREATE_USERS,
            Permission.MANAGE_ALL_LOCATIONS,
            Permission.VIEW_ALL_LOCATIONS,
            Permission.CREATE_LOCATIONS,
            Permission.VIEW_ALL_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.VIEW_FINANCIAL_DATA,
            Permission.MANAGE_AUTOMATION,
            Permission.CONFIGURE_WORKFLOWS,
            Permission.MANAGE_ALL_APPOINTMENTS,
            Permission.VIEW_ALL_CLIENTS,
            Permission.VIEW_REVENUE_DATA,
            Permission.MANAGE_COMMISSIONS,
            Permission.VIEW_PAYMENTS,
            Permission.MANAGE_PAYMENTS,
            Permission.VIEW_PRODUCTS,
            Permission.MANAGE_PRODUCTS,
            Permission.CREATE_PRODUCTS,
            Permission.VIEW_INVENTORY,
            Permission.MANAGE_INVENTORY,
            Permission.USE_POS,
            Permission.MANAGE_POS,
            Permission.PROCESS_SALES,
            Permission.MANAGE_INTEGRATIONS,
            Permission.VIEW_INTEGRATIONS,
        ],
    }

    MENTOR = {
        "name": "mentor",
        "display_name": "6FB Mentor",
        "description": "Mentorship and coaching oversight",
        "permissions": [
            Permission.VIEW_ASSIGNED_LOCATIONS,
            Permission.MANAGE_ASSIGNED_LOCATIONS,
            Permission.VIEW_LOCATION_ANALYTICS,
            Permission.EXPORT_DATA,
            Permission.MANAGE_MENTEES,
            Permission.VIEW_MENTEE_DATA,
            Permission.CREATE_GOALS,
            Permission.MANAGE_TRAINING,
            Permission.MANAGE_LOCATION_APPOINTMENTS,
            Permission.VIEW_LOCATION_CLIENTS,
            Permission.VIEW_REVENUE_DATA,
        ],
    }

    BARBER = {
        "name": "barber",
        "display_name": "Barber",
        "description": "Individual barber access",
        "permissions": [
            Permission.VIEW_OWN_ANALYTICS,
            Permission.MANAGE_OWN_APPOINTMENTS,
            Permission.VIEW_OWN_CLIENTS,
            Permission.VIEW_PRODUCTS,
            Permission.USE_POS,
            Permission.PROCESS_SALES,
            Permission.VIEW_INVENTORY,
        ],
    }

    STAFF = {
        "name": "staff",
        "display_name": "Staff Member",
        "description": "Location staff access",
        "permissions": [
            Permission.VIEW_LOCATION_ANALYTICS,
            Permission.MANAGE_LOCATION_APPOINTMENTS,
            Permission.VIEW_LOCATION_CLIENTS,
            Permission.VIEW_PRODUCTS,
            Permission.USE_POS,
            Permission.PROCESS_SALES,
            Permission.VIEW_INVENTORY,
        ],
    }


class RBACService:
    """Role-Based Access Control Service"""

    def __init__(self, db: Session):
        self.db = db
        self.roles = {
            "super_admin": Role.SUPER_ADMIN,
            "admin": Role.ADMIN,
            "mentor": Role.MENTOR,
            "barber": Role.BARBER,
            "staff": Role.STAFF,
        }

    # Permission Checking
    def has_permission(
        self, user: User, permission: str, resource_id: Optional[int] = None
    ) -> bool:
        """Check if user has specific permission"""
        try:
            # Super admin has all permissions
            if user.role == "super_admin":
                return True

            # Get role permissions
            role_permissions = self.get_role_permissions(user.role)

            # Get custom permissions
            custom_permissions = user.permissions or []

            # Combine permissions
            all_permissions = role_permissions + custom_permissions

            # Check basic permission
            if permission not in all_permissions:
                return False

            # Check context-specific permissions
            return self._check_contextual_permission(user, permission, resource_id)

        except Exception as e:
            logger.error(
                f"Error checking permission {permission} for user {user.id}: {e}"
            )
            return False

    def _check_contextual_permission(
        self, user: User, permission: str, resource_id: Optional[int]
    ) -> bool:
        """Check context-specific permissions (location access, ownership, etc.)"""

        # Location-based permissions
        if permission in [
            Permission.VIEW_ASSIGNED_LOCATIONS,
            Permission.MANAGE_ASSIGNED_LOCATIONS,
        ]:
            if user.role == "mentor":
                # Check if user is mentor for the location
                if resource_id:
                    location = (
                        self.db.query(Location)
                        .filter(Location.id == resource_id)
                        .first()
                    )
                    return location and location.mentor_id == user.id
            return True

        elif permission in [
            Permission.VIEW_LOCATION_ANALYTICS,
            Permission.MANAGE_LOCATION_APPOINTMENTS,
            Permission.VIEW_LOCATION_CLIENTS,
        ]:
            # Check if user has access to the location
            if resource_id:
                return self._user_has_location_access(user, resource_id)
            return True

        elif permission in [
            Permission.VIEW_OWN_ANALYTICS,
            Permission.MANAGE_OWN_APPOINTMENTS,
            Permission.VIEW_OWN_CLIENTS,
        ]:
            # Check if user owns the resource
            if resource_id:
                return self._user_owns_resource(user, permission, resource_id)
            return True

        return True

    def _user_has_location_access(self, user: User, location_id: int) -> bool:
        """Check if user has access to specific location"""

        # Admin and super_admin have access to all locations
        if user.role in ["super_admin", "admin"]:
            return True

        # Mentor has access to assigned locations
        if user.role == "mentor":
            location = (
                self.db.query(Location).filter(Location.id == location_id).first()
            )
            return location and location.mentor_id == user.id

        # Barber/staff have access to their assigned locations
        if user.role in ["barber", "staff"]:
            accessible_locations = user.accessible_locations or []
            if user.primary_location_id:
                accessible_locations.append(user.primary_location_id)
            return location_id in accessible_locations

        return False

    def _user_owns_resource(
        self, user: User, permission: str, resource_id: int
    ) -> bool:
        """Check if user owns the specific resource"""

        if (
            permission == Permission.VIEW_OWN_ANALYTICS
            or permission == Permission.MANAGE_OWN_APPOINTMENTS
        ):
            # For barbers, check if they own the barber record
            if user.role == "barber":
                barber = self.db.query(Barber).filter(Barber.user_id == user.id).first()
                return barber and barber.id == resource_id

        return False

    def get_role_permissions(self, role_name: str) -> List[str]:
        """Get permissions for specific role"""
        role = self.roles.get(role_name)
        return role["permissions"] if role else []

    def get_user_permissions(self, user: User) -> List[str]:
        """Get all permissions for user"""
        role_permissions = self.get_role_permissions(user.role)
        custom_permissions = user.permissions or []
        return list(set(role_permissions + custom_permissions))

    # User Management
    async def create_user(self, user_data: Dict[str, Any], created_by: User) -> User:
        """Create new user with role and permissions"""
        try:
            # Check permission to create users
            if not self.has_permission(created_by, Permission.CREATE_USERS):
                raise HTTPException(
                    status_code=403, detail="Insufficient permissions to create users"
                )

            # Validate role assignment
            target_role = user_data.get("role", "barber")
            if not self._can_assign_role(created_by, target_role):
                raise HTTPException(
                    status_code=403, detail=f"Cannot assign role: {target_role}"
                )

            # Create user
            user = User(**user_data)
            user.created_at = datetime.utcnow()

            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

            # Log activity
            await self._log_user_activity(
                created_by.id,
                "create_user",
                f"Created user: {user.email} with role: {user.role}",
                "user",
                str(user.id),
            )

            logger.info(f"User {user.email} created by {created_by.email}")
            return user

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating user: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user")

    def _can_assign_role(self, assigner: User, target_role: str) -> bool:
        """Check if user can assign specific role"""

        # Super admin can assign any role
        if assigner.role == "super_admin":
            return True

        # Admin can assign non-admin roles
        if assigner.role == "admin":
            return target_role not in ["super_admin", "admin"]

        # Mentors can only assign barber/staff roles
        if assigner.role == "mentor":
            return target_role in ["barber", "staff"]

        return False

    async def update_user_role(
        self, user_id: int, new_role: str, updated_by: User
    ) -> User:
        """Update user role"""
        try:
            # Check permission
            if not self.has_permission(updated_by, Permission.ASSIGN_ROLES):
                raise HTTPException(
                    status_code=403, detail="Insufficient permissions to assign roles"
                )

            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Check if can assign this role
            if not self._can_assign_role(updated_by, new_role):
                raise HTTPException(
                    status_code=403, detail=f"Cannot assign role: {new_role}"
                )

            old_role = user.role
            user.role = new_role
            user.updated_at = datetime.utcnow()

            self.db.commit()

            # Log activity
            await self._log_user_activity(
                updated_by.id,
                "update_user_role",
                f"Changed user {user.email} role from {old_role} to {new_role}",
                "user",
                str(user.id),
            )

            logger.info(
                f"User {user.email} role changed from {old_role} to {new_role} by {updated_by.email}"
            )
            return user

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating user role: {e}")
            raise HTTPException(status_code=500, detail="Failed to update user role")

    async def grant_custom_permission(
        self, user_id: int, permission: str, granted_by: User
    ) -> User:
        """Grant custom permission to user"""
        try:
            if not self.has_permission(granted_by, Permission.ASSIGN_ROLES):
                raise HTTPException(status_code=403, detail="Insufficient permissions")

            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            custom_permissions = user.permissions or []
            if permission not in custom_permissions:
                custom_permissions.append(permission)
                user.permissions = custom_permissions
                user.updated_at = datetime.utcnow()

                self.db.commit()

                # Log activity
                await self._log_user_activity(
                    granted_by.id,
                    "grant_permission",
                    f"Granted permission {permission} to {user.email}",
                    "user",
                    str(user.id),
                )

            return user

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error granting permission: {e}")
            raise HTTPException(status_code=500, detail="Failed to grant permission")

    # Session Management
    async def create_user_session(
        self,
        user: User,
        device_info: str,
        ip_address: str,
        location_id: Optional[int] = None,
    ) -> UserSession:
        """Create new user session"""
        try:
            import secrets

            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(days=7)  # 7 day session

            session = UserSession(
                user_id=user.id,
                session_token=session_token,
                device_info=device_info,
                ip_address=ip_address,
                location_id=location_id,
                expires_at=expires_at,
            )

            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)

            # Update user last login
            user.last_login = datetime.utcnow()
            self.db.commit()

            # Log activity
            await self._log_user_activity(
                user.id,
                "login",
                f"User logged in from {ip_address}",
                "session",
                str(session.id),
            )

            return session

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating user session: {e}")
            raise

    async def validate_session(self, session_token: str) -> Optional[User]:
        """Validate session token and return user"""
        try:
            session = (
                self.db.query(UserSession)
                .filter(
                    UserSession.session_token == session_token,
                    UserSession.is_active == True,
                    UserSession.expires_at > datetime.utcnow(),
                )
                .first()
            )

            if not session:
                return None

            # Update last activity
            session.last_activity = datetime.utcnow()
            self.db.commit()

            return session.user

        except Exception as e:
            logger.error(f"Error validating session: {e}")
            return None

    async def invalidate_session(self, session_token: str) -> bool:
        """Invalidate user session"""
        try:
            session = (
                self.db.query(UserSession)
                .filter(UserSession.session_token == session_token)
                .first()
            )

            if session:
                session.is_active = False
                self.db.commit()

                # Log activity
                await self._log_user_activity(
                    session.user_id,
                    "logout",
                    "User logged out",
                    "session",
                    str(session.id),
                )

                return True

            return False

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error invalidating session: {e}")
            return False

    # Activity Logging
    async def _log_user_activity(
        self,
        user_id: int,
        activity_type: str,
        description: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
    ):
        """Log user activity"""
        try:
            activity = UserActivity(
                user_id=user_id,
                activity_type=activity_type,
                activity_description=description,
                resource_type=resource_type,
                resource_id=resource_id,
            )

            self.db.add(activity)
            self.db.commit()

        except Exception as e:
            logger.error(f"Error logging user activity: {e}")

    async def get_user_activity_log(
        self, user_id: int, limit: int = 50
    ) -> List[UserActivity]:
        """Get user activity log"""
        return (
            self.db.query(UserActivity)
            .filter(UserActivity.user_id == user_id)
            .order_by(UserActivity.created_at.desc())
            .limit(limit)
            .all()
        )

    # Access Control Helpers
    def get_accessible_locations(self, user: User) -> List[int]:
        """Get list of location IDs accessible to user"""
        if user.role in ["super_admin", "admin"]:
            # Admin users can access all locations
            locations = self.db.query(Location).filter(Location.is_active == True).all()
            return [loc.id for loc in locations]

        elif user.role == "mentor":
            # Mentors can access assigned locations
            locations = (
                self.db.query(Location).filter(Location.mentor_id == user.id).all()
            )
            return [loc.id for loc in locations]

        elif user.role in ["barber", "staff"]:
            # Barbers/staff can access their assigned locations
            accessible_locations = user.accessible_locations or []
            if user.primary_location_id:
                accessible_locations.append(user.primary_location_id)
            return list(set(accessible_locations))

        return []

    def filter_locations_by_access(
        self, user: User, locations: List[Location]
    ) -> List[Location]:
        """Filter locations list based on user access"""
        accessible_location_ids = self.get_accessible_locations(user)
        return [loc for loc in locations if loc.id in accessible_location_ids]


# Dependency for FastAPI
async def get_rbac_service(db: Session = Depends(get_db)) -> RBACService:
    """Get RBAC service instance"""
    return RBACService(db)


# Permission decorators
def require_permission(permission: str, resource_id_param: Optional[str] = None):
    """Decorator to require specific permission"""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get user from kwargs (assumes user is passed as parameter)
            user = kwargs.get("current_user")
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")

            # Get resource ID if specified
            resource_id = None
            if resource_id_param and resource_id_param in kwargs:
                resource_id = kwargs[resource_id_param]

            # Get RBAC service
            db = kwargs.get("db")
            if not db:
                raise HTTPException(
                    status_code=500, detail="Database session not available"
                )

            rbac = RBACService(db)

            # Check permission
            if not rbac.has_permission(user, permission, resource_id):
                raise HTTPException(
                    status_code=403, detail=f"Insufficient permissions: {permission}"
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_role(allowed_roles: List[str]):
    """Decorator to require specific role"""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get("current_user")
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")

            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=403, detail=f"Role {user.role} not authorized"
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator
