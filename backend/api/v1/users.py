"""
User management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from config.database import get_db
from models.user import User
from models.barber import Barber
from services.rbac_service import RBACService, Permission, require_permission
from .auth import get_current_user
from pydantic import BaseModel, EmailStr

router = APIRouter()


# Pydantic models
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    primary_location_id: Optional[int] = None
    accessible_locations: Optional[List[int]] = None
    permissions: Optional[List[str]] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    primary_location_id: Optional[int]
    accessible_locations: Optional[List[int]]
    permissions: Optional[List[str]]
    sixfb_certification_level: Optional[str]
    certification_date: Optional[datetime]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class BarberInfo(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    location_id: Optional[int]
    location_name: Optional[str]
    sixfb_score: Optional[float]
    hire_date: Optional[datetime]

    class Config:
        from_attributes = True


# API Endpoints
@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    role: Optional[str] = None,
    location_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of users with optional filters"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
        # If no permission to view all, only return accessible users
        accessible_locations = rbac.get_accessible_locations(current_user)
        if not accessible_locations:
            return []

    query = db.query(User)

    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if location_id:
        query = query.filter(
            (User.primary_location_id == location_id)
            | (User.accessible_locations.contains([location_id]))
        )

    # Apply permission-based filtering
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
        query = query.filter(
            (User.primary_location_id.in_(accessible_locations))
            | (User.accessible_locations.overlap(accessible_locations))
        )

    users = query.offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific user by ID"""
    rbac = RBACService(db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check permissions
    if user.id != current_user.id:  # Not viewing own profile
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
            # Check if user has access to this user's location
            accessible_locations = rbac.get_accessible_locations(current_user)
            user_locations = [user.primary_location_id] + (
                user.accessible_locations or []
            )

            if not any(loc in accessible_locations for loc in user_locations if loc):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this user",
                )

    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user information"""
    rbac = RBACService(db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check permissions
    if user.id != current_user.id:  # Not updating own profile
        if not rbac.has_permission(current_user, Permission.MANAGE_USERS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to update this user",
            )

    # Update fields
    update_data = user_update.dict(exclude_unset=True)

    # Role changes require special permission
    if "role" in update_data and update_data["role"] != user.role:
        if not rbac.has_permission(current_user, Permission.ASSIGN_ROLES):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to change user roles",
            )

    # Apply updates
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete user (soft delete by deactivating)"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.DELETE_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete users",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Don't allow deleting own account
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    # Soft delete
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "User deactivated successfully"}


@router.get("/{user_id}/barber-info", response_model=BarberInfo)
async def get_user_barber_info(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get barber information for a user"""
    # First get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get associated barber record
    barber = db.query(Barber).filter(Barber.user_id == user_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No barber record found for this user",
        )

    # Check permissions
    rbac = RBACService(db)
    if barber.id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this barber",
                )

    return {
        "id": barber.id,
        "user_id": barber.user_id,
        "first_name": barber.first_name,
        "last_name": barber.last_name,
        "email": barber.email,
        "phone": barber.phone,
        "location_id": barber.location_id,
        "location_name": barber.location.name if barber.location else None,
        "sixfb_score": None,  # Calculate from metrics
        "hire_date": barber.created_at,
    }


@router.post("/{user_id}/assign-role")
async def assign_user_role(
    user_id: int,
    new_role: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign role to user"""
    rbac = RBACService(db)

    valid_roles = ["super_admin", "admin", "mentor", "barber", "staff"]
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    updated_user = await rbac.update_user_role(user_id, new_role, current_user)

    return {
        "message": f"Role updated successfully",
        "user_id": updated_user.id,
        "new_role": updated_user.role,
    }


@router.post("/{user_id}/grant-permission")
async def grant_permission(
    user_id: int,
    permission: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Grant custom permission to user"""
    rbac = RBACService(db)

    updated_user = await rbac.grant_custom_permission(user_id, permission, current_user)

    return {
        "message": "Permission granted successfully",
        "user_id": updated_user.id,
        "permissions": updated_user.permissions,
    }
