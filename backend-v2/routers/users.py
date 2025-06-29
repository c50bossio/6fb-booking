from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
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