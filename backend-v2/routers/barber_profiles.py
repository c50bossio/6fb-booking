"""
Barber Profiles Router V2

This router handles all barber profile-related operations including profile management,
portfolio images, and specialties for the V2 API.
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from db import get_db
from dependencies import get_current_user
from models import User
from services.barber_profile_service import BarberProfileService
from schemas_new.barber_profile import (
    BarberProfileCreate,
    BarberProfileUpdate,
    BarberProfileResponse,
    BarberPortfolioImageCreate,
    BarberPortfolioImageUpdate,
    BarberPortfolioImageResponse,
    BarberSpecialtyCreate,
    BarberSpecialtyUpdate,
    BarberSpecialtyResponse,
    ProfileCompletionStatus,
    ImageUploadResponse
)
# PublicBarberProfile removed - BookedBarber V2 is NOT a marketplace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/barber-profiles", tags=["Barber Profiles V2"])


def get_barber_profile_service(db: Session = Depends(get_db)) -> BarberProfileService:
    """Dependency to get barber profile service."""
    return BarberProfileService(db)


def verify_barber_role(current_user: User = Depends(get_current_user)) -> User:
    """Verify that the current user is a barber."""
    if current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can access this endpoint"
        )
    return current_user


def verify_barber_or_owner(barber_id: int, current_user: User = Depends(get_current_user)) -> User:
    """Verify that the current user is the barber or has admin permissions."""
    if current_user.role in ["admin", "super_admin"]:
        return current_user
    
    if current_user.id != barber_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own profile"
        )
    
    if current_user.role not in ["barber", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can access this endpoint"
        )
    
    return current_user


# Profile Management Endpoints
@router.get("/{barber_id}", response_model=BarberProfileResponse)
async def get_barber_profile(
    barber_id: int,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Get a barber's full profile (private view)."""
    barber = service.get_barber_profile(barber_id, include_relationships=True)
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber profile not found"
        )
    
    return BarberProfileResponse(
        id=barber.id,
        name=barber.name,
        email=barber.email,
        bio=barber.bio,
        years_experience=barber.years_experience,
        profile_image_url=barber.profile_image_url,
        profile_slug=barber.profile_slug,
        profile_completed=barber.profile_completed,
        social_links=barber.social_links,
        specialties=[
            BarberSpecialtyResponse(
                id=spec.id,
                barber_id=spec.barber_id,
                specialty_name=spec.specialty_name,
                category=spec.category,
                experience_level=spec.experience_level,
                is_primary=spec.is_primary,
                created_at=spec.created_at
            ) for spec in barber.specialties_rel
        ],
        portfolio_images=[
            BarberPortfolioImageResponse(
                id=img.id,
                barber_id=img.barber_id,
                image_url=img.image_url,
                title=img.title,
                description=img.description,
                display_order=img.display_order,
                is_featured=img.is_featured,
                created_at=img.created_at,
                updated_at=img.updated_at
            ) for img in barber.portfolio_images
        ],
        created_at=barber.created_at
    )


@router.post("/{barber_id}", response_model=BarberProfileResponse)
async def create_barber_profile(
    barber_id: int,
    profile_data: BarberProfileCreate,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Create or update a barber profile."""
    barber = service.create_barber_profile(barber_id, profile_data)
    
    return BarberProfileResponse(
        id=barber.id,
        name=barber.name,
        email=barber.email,
        bio=barber.bio,
        years_experience=barber.years_experience,
        profile_image_url=barber.profile_image_url,
        profile_slug=barber.profile_slug,
        profile_completed=barber.profile_completed,
        social_links=barber.social_links,
        specialties=[],  # Will be populated by the service
        portfolio_images=[],
        created_at=barber.created_at
    )


@router.put("/{barber_id}", response_model=BarberProfileResponse)
async def update_barber_profile(
    barber_id: int,
    profile_data: BarberProfileUpdate,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Update an existing barber profile."""
    barber = service.update_barber_profile(barber_id, profile_data)
    
    # Get updated barber with relationships
    updated_barber = service.get_barber_profile(barber_id, include_relationships=True)
    
    return BarberProfileResponse(
        id=updated_barber.id,
        name=updated_barber.name,
        email=updated_barber.email,
        bio=updated_barber.bio,
        years_experience=updated_barber.years_experience,
        profile_image_url=updated_barber.profile_image_url,
        profile_slug=updated_barber.profile_slug,
        profile_completed=updated_barber.profile_completed,
        social_links=updated_barber.social_links,
        specialties=[
            BarberSpecialtyResponse(
                id=spec.id,
                barber_id=spec.barber_id,
                specialty_name=spec.specialty_name,
                category=spec.category,
                experience_level=spec.experience_level,
                is_primary=spec.is_primary,
                created_at=spec.created_at
            ) for spec in updated_barber.specialties_rel
        ],
        portfolio_images=[
            BarberPortfolioImageResponse(
                id=img.id,
                barber_id=img.barber_id,
                image_url=img.image_url,
                title=img.title,
                description=img.description,
                display_order=img.display_order,
                is_featured=img.is_featured,
                created_at=img.created_at,
                updated_at=img.updated_at
            ) for img in updated_barber.portfolio_images
        ],
        created_at=updated_barber.created_at
    )


@router.get("/{barber_id}/completion", response_model=ProfileCompletionStatus)
async def get_profile_completion_status(
    barber_id: int,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Get profile completion status for a barber."""
    return service.get_profile_completion_status(barber_id)


# Portfolio Image Management
@router.get("/{barber_id}/portfolio", response_model=List[BarberPortfolioImageResponse])
async def get_portfolio_images(
    barber_id: int,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Get all portfolio images for a barber."""
    images = service.get_portfolio_images(barber_id)
    
    return [
        BarberPortfolioImageResponse(
            id=img.id,
            barber_id=img.barber_id,
            image_url=img.image_url,
            title=img.title,
            description=img.description,
            display_order=img.display_order,
            is_featured=img.is_featured,
            created_at=img.created_at,
            updated_at=img.updated_at
        ) for img in images
    ]


@router.post("/{barber_id}/portfolio", response_model=BarberPortfolioImageResponse)
async def add_portfolio_image(
    barber_id: int,
    image_data: BarberPortfolioImageCreate,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Add a new portfolio image for a barber."""
    image = service.add_portfolio_image(barber_id, image_data)
    
    return BarberPortfolioImageResponse(
        id=image.id,
        barber_id=image.barber_id,
        image_url=image.image_url,
        title=image.title,
        description=image.description,
        display_order=image.display_order,
        is_featured=image.is_featured,
        created_at=image.created_at,
        updated_at=image.updated_at
    )


@router.put("/{barber_id}/portfolio/{image_id}", response_model=BarberPortfolioImageResponse)
async def update_portfolio_image(
    barber_id: int,
    image_id: int,
    image_data: BarberPortfolioImageUpdate,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Update a portfolio image."""
    image = service.update_portfolio_image(barber_id, image_id, image_data)
    
    return BarberPortfolioImageResponse(
        id=image.id,
        barber_id=image.barber_id,
        image_url=image.image_url,
        title=image.title,
        description=image.description,
        display_order=image.display_order,
        is_featured=image.is_featured,
        created_at=image.created_at,
        updated_at=image.updated_at
    )


@router.delete("/{barber_id}/portfolio/{image_id}")
async def delete_portfolio_image(
    barber_id: int,
    image_id: int,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Delete a portfolio image."""
    success = service.delete_portfolio_image(barber_id, image_id)
    if success:
        return {"message": "Portfolio image deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete portfolio image"
        )


# Specialty Management
@router.get("/{barber_id}/specialties", response_model=List[BarberSpecialtyResponse])
async def get_barber_specialties(
    barber_id: int,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Get all specialties for a barber."""
    specialties = service.get_specialties(barber_id)
    
    return [
        BarberSpecialtyResponse(
            id=spec.id,
            barber_id=spec.barber_id,
            specialty_name=spec.specialty_name,
            category=spec.category,
            experience_level=spec.experience_level,
            is_primary=spec.is_primary,
            created_at=spec.created_at
        ) for spec in specialties
    ]


@router.post("/{barber_id}/specialties", response_model=BarberSpecialtyResponse)
async def add_barber_specialty(
    barber_id: int,
    specialty_data: BarberSpecialtyCreate,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Add a new specialty for a barber."""
    specialty = service.add_specialty(barber_id, specialty_data)
    
    return BarberSpecialtyResponse(
        id=specialty.id,
        barber_id=specialty.barber_id,
        specialty_name=specialty.specialty_name,
        category=specialty.category,
        experience_level=specialty.experience_level,
        is_primary=specialty.is_primary,
        created_at=specialty.created_at
    )


@router.delete("/{barber_id}/specialties/{specialty_id}")
async def delete_barber_specialty(
    barber_id: int,
    specialty_id: int,
    service: BarberProfileService = Depends(get_barber_profile_service),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Delete a specialty."""
    success = service.delete_specialty(barber_id, specialty_id)
    if success:
        return {"message": "Specialty deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete specialty"
        )


# Image Upload Endpoint (Placeholder for file upload functionality)
@router.post("/{barber_id}/upload-image", response_model=ImageUploadResponse)
async def upload_profile_image(
    barber_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(verify_barber_or_owner)
):
    """Upload a profile or portfolio image."""
    # TODO: Implement actual file upload to cloud storage (AWS S3, etc.)
    # For now, return a placeholder response
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed"
        )
    
    # Validate file size (5MB limit)
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    # TODO: Upload to cloud storage and return actual URL
    placeholder_url = f"https://placeholder.com/barber-{barber_id}-{file.filename}"
    
    logger.info(f"Image uploaded for barber {barber_id}: {file.filename} ({file_size} bytes)")
    
    return ImageUploadResponse(
        image_url=placeholder_url,
        image_id=f"img_{barber_id}_{hash(file.filename)}",
        file_size=file_size,
        mime_type=file.content_type
    )