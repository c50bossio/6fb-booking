from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserOrganization, Organization
from utils.auth import get_current_user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current admin user."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def check_user_role(allowed_roles: list[str]):
    """Dependency to check if user has one of the allowed roles."""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

def require_organization_access(db: Session, user: User, organization_id: int) -> UserOrganization:
    """Check if user has access to the specified organization."""
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id,
        UserOrganization.organization_id == organization_id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    return user_org

def get_current_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Organization:
    """Get the current user's primary organization."""
    # Get user's primary organization
    user_org = db.query(UserOrganization).filter(
        UserOrganization.user_id == current_user.id
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not associated with any organization"
        )
    
    organization = db.query(Organization).filter(
        Organization.id == user_org.organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return organization

def require_role(user: User, allowed_roles: list) -> None:
    """Check if user has one of the allowed roles."""
    # Convert enum values to strings if needed
    role_strings = []
    for role in allowed_roles:
        if hasattr(role, 'value'):
            role_strings.append(role.value)
        else:
            role_strings.append(str(role))
    
    if user.role not in role_strings:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this operation"
        )