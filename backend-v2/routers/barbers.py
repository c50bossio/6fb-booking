from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from utils.auth import get_current_user
from services.barber_profile_service import barber_profile_service
import models
import schemas

router = APIRouter(prefix="/barbers", tags=["barbers"])

@router.get("/")
def get_all_barbers(
    db: Session = Depends(get_db)
):
    """Get all active barbers (public endpoint for booking)"""
    barbers = db.query(models.User).filter(
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).all()
    
    # Return simple dict to avoid Pydantic schema issues
    return [
        {
            "id": barber.id,
            "name": barber.name,
            "email": barber.email,
            "role": barber.role,
            "created_at": str(barber.created_at) if barber.created_at else None
        }
        for barber in barbers
    ]

@router.get("/profiles", response_model=schemas.BarberProfileListResponse, tags=["barber-profiles"])
async def list_barber_profiles(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    active_only: bool = Query(True, description="Filter to only active profiles"),
    search: Optional[str] = Query(None, description="Search by name, bio, or specialties"),
    specialties: Optional[List[str]] = Query(None, description="Filter by specialties"),
    min_experience: Optional[int] = Query(None, ge=0, description="Minimum years of experience"),
    max_hourly_rate: Optional[float] = Query(None, ge=0, description="Maximum hourly rate"),
    order_by: str = Query("created_at", description="Field to order by: created_at, name, experience, hourly_rate, updated_at"),
    order_desc: bool = Query(True, description="Sort in descending order"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all barber profiles with filtering and pagination.
    
    Supports filtering by:
    - **active_only**: Show only active profiles
    - **search**: Search in name, bio, and specialties
    - **specialties**: Filter by specific specialties
    - **min_experience**: Minimum years of experience
    - **max_hourly_rate**: Maximum hourly rate
    
    Supports ordering by:
    - created_at (default)
    - name
    - experience
    - hourly_rate
    - updated_at
    """
    profiles, total = barber_profile_service.list_profiles(
        db=db,
        skip=skip,
        limit=limit,
        active_only=active_only,
        search=search,
        specialties=specialties,
        min_experience=min_experience,
        max_hourly_rate=max_hourly_rate,
        order_by=order_by,
        order_desc=order_desc
    )
    
    # Count active and inactive profiles for the schema
    active_count = len([p for p in profiles if p.is_active])
    inactive_count = len([p for p in profiles if not p.is_active])
    
    # Transform profiles to match schema expectations
    formatted_profiles = []
    for profile in profiles:
        formatted_profile = {
            # Profile data
            "id": profile.id,
            "user_id": profile.user_id,
            "bio": profile.bio,
            "years_experience": profile.years_experience,
            "profile_image_url": profile.profile_image_url,
            "instagram_handle": profile.instagram_handle,
            "website_url": profile.website_url,
            "specialties": profile.specialties or [],
            "certifications": profile.certifications or [],
            "hourly_rate": profile.hourly_rate,
            "is_active": profile.is_active,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
            # User data from joined relationship
            "user_name": profile.user.name if profile.user else f"User #{profile.user_id}",
            "user_email": profile.user.email if profile.user else "",
            "user_phone": profile.user.phone if profile.user else None,
            "user_role": profile.user.role if profile.user else "unknown",
            "user_is_active": profile.user.is_active if profile.user else False,
            "user_created_at": profile.user.created_at if profile.user else profile.created_at,
        }
        formatted_profiles.append(formatted_profile)
    
    return {
        "profiles": formatted_profiles,
        "total": total,
        "active_count": active_count,
        "inactive_count": inactive_count
    }

@router.post("/profiles", response_model=schemas.BarberProfileResponse, tags=["barber-profiles"])
async def create_barber_profile(
    profile_data: schemas.BarberProfileCreate,
    barber_id: Optional[int] = Query(None, description="Barber user ID (admin only, defaults to current user)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new barber profile.
    
    - **profile_data**: Profile information to create
    - **barber_id**: Optional - admin users can create profiles for other users
    - Regular users can only create profiles for themselves
    """
    # Determine target user ID
    target_user_id = barber_id if barber_id else current_user.id
    
    # If creating for another user, check admin permissions
    if target_user_id != current_user.id:
        admin_roles = ["admin", "super_admin", "shop_owner", "enterprise_owner"]
        if current_user.role not in admin_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can create profiles for other users"
            )
    
    profile = barber_profile_service.create_profile(
        db=db,
        user_id=target_user_id,
        profile_data=profile_data
    )
    
    return profile

@router.get("/profiles/stats", tags=["barber-profiles"])
async def get_profile_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get statistics about barber profiles.
    
    Returns:
    - Total number of profiles
    - Active profiles count
    - Inactive profiles count
    - Complete profiles count (with all required fields)
    
    Admin access only.
    """
    admin_roles = ["admin", "super_admin", "shop_owner", "enterprise_owner"]
    if current_user.role not in admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for profile statistics"
        )
    
    stats = barber_profile_service.get_profile_stats(db)
    return stats

@router.get("/{barber_id}", response_model=schemas.UserResponse)
def get_barber(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific barber by ID"""
    barber = db.query(models.User).filter(
        models.User.id == barber_id,
        models.User.role.in_(["barber", "admin", "super_admin"]),
        models.User.is_active == True
    ).first()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    return barber


# === BARBER PROFILE ENDPOINTS ===

@router.get("/{barber_id}/profile", response_model=schemas.BarberProfileWithUserResponse, tags=["barber-profiles"])
async def get_barber_profile(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get full barber profile by barber ID.
    
    - **barber_id**: The ID of the barber user
    - Returns complete profile information including user details
    """
    profile = barber_profile_service.get_profile_by_user_id(
        db=db, 
        user_id=barber_id, 
        include_user=True
    )
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber profile not found"
        )
    
    return profile


@router.put("/{barber_id}/profile", response_model=schemas.BarberProfileResponse, tags=["barber-profiles"])
async def update_barber_profile(
    barber_id: int,
    profile_data: schemas.BarberProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update barber profile information.
    
    - **barber_id**: The ID of the barber user
    - **profile_data**: Updated profile information
    - Only the profile owner or admin users can update
    """
    updated_profile = barber_profile_service.update_profile(
        db=db,
        user_id=barber_id,
        profile_data=profile_data,
        current_user=current_user
    )
    
    return updated_profile


@router.post("/{barber_id}/profile/image", tags=["barber-profiles"])
async def upload_profile_image(
    barber_id: int,
    image: UploadFile = File(..., description="Profile image (JPEG, PNG, WebP, max 5MB)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload and update barber profile image.
    
    - **barber_id**: The ID of the barber user
    - **image**: Image file to upload (max 5MB)
    - Supported formats: JPEG, PNG, WebP
    - Image will be automatically resized and optimized
    - Only the profile owner or admin users can upload
    """
    result = barber_profile_service.upload_profile_image(
        db=db,
        user_id=barber_id,
        image_file=image,
        current_user=current_user
    )
    
    return result

