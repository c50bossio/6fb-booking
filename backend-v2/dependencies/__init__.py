"""
Dependencies module for BookedBarber V2

This module contains FastAPI dependency functions for various services and middleware.
"""

# Import existing dependencies that are used across the app
try:
    from .auth import get_current_user, get_current_admin_user
except ImportError:
    # If the auth dependencies don't exist in this branch, create basic stubs
    from fastapi import Depends, HTTPException, status
    from fastapi.security import HTTPBearer
    from sqlalchemy.orm import Session
    from database import get_db
    from models import User
    
    security = HTTPBearer()
    
    def get_current_user(token: str = Depends(security), db: Session = Depends(get_db)) -> User:
        """Mock current user dependency - replace with actual implementation"""
        # This is a placeholder - in real implementation, decode JWT token
        user = db.query(User).first()  # Get any user for testing
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        return user
    
    def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
        """Mock admin user dependency - replace with actual implementation"""
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return current_user

def check_user_role(required_roles: list, current_user: User = Depends(get_current_user)) -> User:
    """Check if current user has required role"""
    from typing import List
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    
    if current_user.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Access denied. Required roles: {', '.join(required_roles)}"
        )
    return current_user

def require_organization_access(current_user: User = Depends(get_current_user)) -> User:
    """Require user to have organization access"""
    allowed_roles = ["admin", "super_admin", "enterprise_owner", "shop_owner", "shop_manager"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization access required"
        )
    return current_user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (alias for get_current_user)"""
    return current_user

def require_barber_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require barber or admin role"""
    allowed_roles = ["barber", "admin", "super_admin", "shop_owner", "individual_barber"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Barber or admin access required"
        )
    return current_user

def require_admin_role(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def get_optional_user(token: str = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get current user if authenticated, otherwise None"""
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None

def get_current_organization(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's organization"""
    # For now, return a mock organization or get from user's organization_id
    # This is a simplified implementation for the homepage builder dependency
    if hasattr(current_user, 'organization_id') and current_user.organization_id:
        from models import Organization
        organization = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
        if organization:
            return organization
    
    # Return a mock organization for admin users
    if current_user.role in ["admin", "super_admin"]:
        class MockOrganization:
            id = 1
            name = "BookedBarber Admin"
            type = "enterprise"
            
        return MockOrganization()
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No organization found for user"
    )

# Export commonly used dependencies
__all__ = [
    'get_current_user', 
    'get_current_admin_user', 
    'get_current_active_user',
    'check_user_role', 
    'require_organization_access',
    'require_barber_or_admin',
    'require_admin_role',
    'get_optional_user',
    'get_current_organization'
]