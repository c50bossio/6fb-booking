from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db import get_db
from dependencies import get_current_user
import models
import schemas
import pytz
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's profile including timezone"""
    return current_user

@router.get("/timezone", response_model=dict)
def get_user_timezone(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's timezone setting"""
    return {
        "timezone": current_user.timezone,
        "current_time": datetime.now(pytz.timezone(current_user.timezone)).isoformat()
    }

@router.put("/timezone", response_model=dict)
def update_user_timezone(
    timezone_data: schemas.TimezoneUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's timezone"""
    # Update user timezone
    current_user.timezone = timezone_data.timezone
    db.commit()
    db.refresh(current_user)
    
    # Return updated timezone info
    tz = pytz.timezone(timezone_data.timezone)
    current_time = datetime.now(tz)
    
    return {
        "message": "Timezone updated successfully",
        "timezone": current_user.timezone,
        "current_time": current_time.isoformat(),
        "offset": current_time.strftime('%z')
    }

@router.put("/profile", response_model=schemas.UserResponse)
def update_user_profile(
    profile_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update user profile (name, email, etc.)"""
    # Update allowed fields
    allowed_fields = ["name", "email"]
    
    for field, value in profile_data.items():
        if field in allowed_fields and value is not None:
            setattr(current_user, field, value)
    
    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update profile: {str(e)}"
        )
    
    return current_user

@router.put("/onboarding", response_model=schemas.UserResponse)
def update_onboarding_status(
    onboarding_data: schemas.OnboardingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update user's onboarding status"""
    # Update onboarding fields
    if onboarding_data.completed is not None:
        current_user.onboarding_completed = onboarding_data.completed
    
    # Update onboarding status JSON
    if current_user.onboarding_status is None:
        current_user.onboarding_status = {}
    
    if onboarding_data.completed_steps is not None:
        current_user.onboarding_status["completed_steps"] = onboarding_data.completed_steps
    
    if onboarding_data.current_step is not None:
        current_user.onboarding_status["current_step"] = onboarding_data.current_step
    
    if onboarding_data.skipped is not None:
        current_user.onboarding_status["skipped"] = onboarding_data.skipped
    
    # Mark user as not new if they're completing onboarding
    if onboarding_data.completed:
        current_user.is_new_user = False
    
    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update onboarding status: {str(e)}"
        )
    
    return current_user

@router.get("/", response_model=List[schemas.UserResponse])
def get_all_users(
    role: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all users. Optionally filter by role."""
    query = db.query(models.User).filter(models.User.is_active == True)
    
    if role:
        query = query.filter(models.User.role == role)
    
    return query.all()

@router.put("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    role_update: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a user's role (admin only)"""
    # Check if current user is admin
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change user roles"
        )
    
    # Prevent users from changing their own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )
    
    # Get the user to update
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent changing super_admin roles unless current user is super_admin
    if user.role == "super_admin" and current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can modify super admin roles"
        )
    
    # Update the role
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    
    return user