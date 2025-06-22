"""
Role-Based Access Control (RBAC) System for 6FB Booking Platform
Implements fine-grained permissions for data access and operations
"""

from typing import List, Dict, Any, Optional
from enum import Enum
from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class Permission(Enum):
    """Enumeration of all possible permissions in the system"""
    
    # Client data permissions
    VIEW_OWN_CLIENTS = "view_own_clients"
    VIEW_ALL_CLIENTS = "view_all_clients"
    CREATE_CLIENT = "create_client"
    UPDATE_OWN_CLIENTS = "update_own_clients"
    UPDATE_ALL_CLIENTS = "update_all_clients"
    DELETE_OWN_CLIENTS = "delete_own_clients"
    DELETE_ALL_CLIENTS = "delete_all_clients"
    
    # Appointment permissions
    VIEW_OWN_APPOINTMENTS = "view_own_appointments"
    VIEW_ALL_APPOINTMENTS = "view_all_appointments"
    CREATE_APPOINTMENT = "create_appointment"
    UPDATE_OWN_APPOINTMENTS = "update_own_appointments"
    UPDATE_ALL_APPOINTMENTS = "update_all_appointments"
    CANCEL_OWN_APPOINTMENTS = "cancel_own_appointments"
    CANCEL_ALL_APPOINTMENTS = "cancel_all_appointments"
    
    # Payment permissions
    VIEW_OWN_PAYMENTS = "view_own_payments"
    VIEW_ALL_PAYMENTS = "view_all_payments"
    PROCESS_PAYMENTS = "process_payments"
    REFUND_PAYMENTS = "refund_payments"
    
    # User management permissions
    VIEW_USERS = "view_users"
    CREATE_USER = "create_user"
    UPDATE_USER = "update_user"
    DELETE_USER = "delete_user"
    MANAGE_ROLES = "manage_roles"
    
    # Analytics permissions
    VIEW_OWN_ANALYTICS = "view_own_analytics"
    VIEW_ALL_ANALYTICS = "view_all_analytics"
    EXPORT_DATA = "export_data"
    
    # System administration
    SYSTEM_ADMIN = "system_admin"
    MANAGE_SETTINGS = "manage_settings"
    VIEW_LOGS = "view_logs"

class Role(Enum):
    """System roles with predefined permission sets"""
    
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MENTOR = "mentor"
    BARBER = "barber"
    STAFF = "staff"
    CLIENT = "client"

# Role permission mappings
ROLE_PERMISSIONS: Dict[Role, List[Permission]] = {
    Role.SUPER_ADMIN: [p for p in Permission],  # All permissions
    
    Role.ADMIN: [
        Permission.VIEW_ALL_CLIENTS,
        Permission.UPDATE_ALL_CLIENTS,
        Permission.DELETE_ALL_CLIENTS,
        Permission.VIEW_ALL_APPOINTMENTS,
        Permission.UPDATE_ALL_APPOINTMENTS,
        Permission.CANCEL_ALL_APPOINTMENTS,
        Permission.VIEW_ALL_PAYMENTS,
        Permission.PROCESS_PAYMENTS,
        Permission.REFUND_PAYMENTS,
        Permission.VIEW_USERS,
        Permission.CREATE_USER,
        Permission.UPDATE_USER,
        Permission.VIEW_ALL_ANALYTICS,
        Permission.EXPORT_DATA,
        Permission.MANAGE_SETTINGS,
        Permission.VIEW_LOGS,
    ],
    
    Role.MENTOR: [
        Permission.VIEW_ALL_CLIENTS,
        Permission.UPDATE_ALL_CLIENTS,
        Permission.VIEW_ALL_APPOINTMENTS,
        Permission.UPDATE_ALL_APPOINTMENTS,
        Permission.VIEW_ALL_PAYMENTS,
        Permission.VIEW_USERS,
        Permission.VIEW_ALL_ANALYTICS,
        Permission.EXPORT_DATA,
    ],
    
    Role.BARBER: [
        Permission.VIEW_OWN_CLIENTS,
        Permission.CREATE_CLIENT,
        Permission.UPDATE_OWN_CLIENTS,
        Permission.DELETE_OWN_CLIENTS,
        Permission.VIEW_OWN_APPOINTMENTS,
        Permission.CREATE_APPOINTMENT,
        Permission.UPDATE_OWN_APPOINTMENTS,
        Permission.CANCEL_OWN_APPOINTMENTS,
        Permission.VIEW_OWN_PAYMENTS,
        Permission.PROCESS_PAYMENTS,
        Permission.VIEW_OWN_ANALYTICS,
    ],
    
    Role.STAFF: [
        Permission.VIEW_OWN_CLIENTS,
        Permission.CREATE_CLIENT,
        Permission.UPDATE_OWN_CLIENTS,
        Permission.VIEW_OWN_APPOINTMENTS,
        Permission.CREATE_APPOINTMENT,
        Permission.UPDATE_OWN_APPOINTMENTS,
        Permission.VIEW_OWN_PAYMENTS,
    ],
    
    Role.CLIENT: [
        Permission.VIEW_OWN_APPOINTMENTS,
        Permission.CANCEL_OWN_APPOINTMENTS,
        Permission.VIEW_OWN_PAYMENTS,
    ],
}

class RBACManager:
    """Role-Based Access Control Manager"""
    
    def __init__(self):
        pass
    
    def get_user_permissions(self, user) -> List[Permission]:
        """Get all permissions for a user based on their role"""
        try:
            user_role = Role(user.role)
            base_permissions = ROLE_PERMISSIONS.get(user_role, [])
            
            # Add custom permissions if user has any
            custom_permissions = []
            if user.permissions:
                custom_permissions = [
                    Permission(p) for p in user.permissions 
                    if p in [perm.value for perm in Permission]
                ]
            
            return list(set(base_permissions + custom_permissions))
        except ValueError:
            logger.warning(f"Unknown role for user {user.id}: {user.role}")
            return []
    
    def has_permission(self, user, permission: Permission) -> bool:
        """Check if user has a specific permission"""
        user_permissions = self.get_user_permissions(user)
        return permission in user_permissions
    
    def can_access_client(self, user, client_id: int, db: Session) -> bool:
        """Check if user can access a specific client's data"""
        from models.client import Client
        from models.barber import Barber
        
        # Super admin and admin can access all clients
        if self.has_permission(user, Permission.VIEW_ALL_CLIENTS):
            return True
        
        # Check if user can view own clients
        if self.has_permission(user, Permission.VIEW_OWN_CLIENTS):
            # Get the client and check if it belongs to user's barber profile
            client = db.query(Client).filter(Client.id == client_id).first()
            if not client:
                return False
            
            # Get user's barber profile
            barber = db.query(Barber).filter(Barber.user_id == user.id).first()
            if not barber:
                return False
            
            return client.barber_id == barber.id
        
        return False
    
    def can_access_appointment(self, user, appointment_id: int, db: Session) -> bool:
        """Check if user can access a specific appointment"""
        from models.appointment import Appointment
        from models.barber import Barber
        
        # Super admin and admin can access all appointments
        if self.has_permission(user, Permission.VIEW_ALL_APPOINTMENTS):
            return True
        
        # Check if user can view own appointments
        if self.has_permission(user, Permission.VIEW_OWN_APPOINTMENTS):
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                return False
            
            # For barbers - check if appointment belongs to their profile
            if user.role in ['barber', 'staff']:
                barber = db.query(Barber).filter(Barber.user_id == user.id).first()
                if barber:
                    return appointment.barber_id == barber.id
            
            # For clients - check if appointment belongs to them
            if user.role == 'client':
                return appointment.user_id == user.id
        
        return False
    
    def can_access_payment(self, user, payment_id: int, db: Session) -> bool:
        """Check if user can access payment information"""
        from models.payment import Payment
        from models.appointment import Appointment
        from models.barber import Barber
        
        # Super admin and admin can access all payments
        if self.has_permission(user, Permission.VIEW_ALL_PAYMENTS):
            return True
        
        if self.has_permission(user, Permission.VIEW_OWN_PAYMENTS):
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if not payment:
                return False
            
            # Get the associated appointment
            appointment = db.query(Appointment).filter(
                Appointment.id == payment.appointment_id
            ).first()
            if not appointment:
                return False
            
            # Check access based on role
            if user.role in ['barber', 'staff']:
                barber = db.query(Barber).filter(Barber.user_id == user.id).first()
                if barber:
                    return appointment.barber_id == barber.id
            elif user.role == 'client':
                return appointment.user_id == user.id
        
        return False
    
    def filter_data_by_access(self, user, query, model_class, db: Session):
        """Filter database query based on user's access rights"""
        from models.client import Client
        from models.appointment import Appointment
        from models.payment import Payment
        from models.barber import Barber
        
        # Super admin and admin see everything
        if user.role in ['super_admin', 'admin']:
            return query
        
        # Mentors see all data for their assigned barbers
        if user.role == 'mentor':
            # TODO: Implement mentor-barber relationships
            return query
        
        # Barbers and staff see only their own data
        if user.role in ['barber', 'staff']:
            barber = db.query(Barber).filter(Barber.user_id == user.id).first()
            if not barber:
                # Return empty query if user has no barber profile
                return query.filter(False)
            
            if model_class == Client:
                return query.filter(Client.barber_id == barber.id)
            elif model_class == Appointment:
                return query.filter(Appointment.barber_id == barber.id)
            elif model_class == Payment:
                # Filter payments through appointments
                return query.join(Appointment).filter(Appointment.barber_id == barber.id)
        
        # Clients see only their own data
        if user.role == 'client':
            if model_class == Appointment:
                return query.filter(Appointment.user_id == user.id)
            elif model_class == Payment:
                return query.join(Appointment).filter(Appointment.user_id == user.id)
            else:
                # Clients shouldn't see other model data
                return query.filter(False)
        
        # Default: no access
        return query.filter(False)

# Global RBAC manager instance
rbac = RBACManager()

def require_permission(permission: Permission):
    """Decorator to require specific permission for endpoint access"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if not rbac.has_permission(current_user, permission):
                logger.warning(
                    f"User {current_user.id} ({current_user.role}) attempted to access "
                    f"endpoint requiring {permission.value}"
                )
                raise HTTPException(
                    status_code=403, 
                    detail=f"Permission {permission.value} required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_resource_access(resource_type: str, resource_id_param: str):
    """Decorator to require access to specific resource"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            resource_id = kwargs.get(resource_id_param)
            
            if not all([current_user, db, resource_id]):
                raise HTTPException(status_code=400, detail="Missing required parameters")
            
            # Check resource access based on type
            if resource_type == 'client':
                if not rbac.can_access_client(current_user, resource_id, db):
                    raise HTTPException(status_code=403, detail="Access denied to client data")
            elif resource_type == 'appointment':
                if not rbac.can_access_appointment(current_user, resource_id, db):
                    raise HTTPException(status_code=403, detail="Access denied to appointment data")
            elif resource_type == 'payment':
                if not rbac.can_access_payment(current_user, resource_id, db):
                    raise HTTPException(status_code=403, detail="Access denied to payment data")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def get_filtered_query(current_user, model_class, db: Session):
    """Get a filtered query based on user's access rights"""
    base_query = db.query(model_class)
    return rbac.filter_data_by_access(current_user, base_query, model_class, db)

# Utility functions for common access checks
def can_modify_client(current_user, client_id: int, db: Session) -> bool:
    """Check if user can modify a client record"""
    return (rbac.has_permission(current_user, Permission.UPDATE_ALL_CLIENTS) or
            (rbac.has_permission(current_user, Permission.UPDATE_OWN_CLIENTS) and
             rbac.can_access_client(current_user, client_id, db)))

def can_delete_client(current_user, client_id: int, db: Session) -> bool:
    """Check if user can delete a client record"""
    return (rbac.has_permission(current_user, Permission.DELETE_ALL_CLIENTS) or
            (rbac.has_permission(current_user, Permission.DELETE_OWN_CLIENTS) and
             rbac.can_access_client(current_user, client_id, db)))

def can_process_payment(current_user, appointment_id: int, db: Session) -> bool:
    """Check if user can process payment for an appointment"""
    return (rbac.has_permission(current_user, Permission.PROCESS_PAYMENTS) and
            rbac.can_access_appointment(current_user, appointment_id, db))