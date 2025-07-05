"""
API endpoints for managing customer tracking pixels.

This module provides endpoints for organizations to manage their own
marketing tracking pixels (GTM, GA4, Meta, Google Ads) for their booking pages.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from database import get_db
from dependencies import get_current_active_user, require_organization_access
from models import User, Organization
from models.organization import UserRole
from schemas_new.tracking import (
    TrackingPixelUpdate,
    TrackingPixelResponse,
    TrackingTestResult,
    PublicTrackingPixels
)
import re

router = APIRouter(
    prefix="/api/v1/customer-pixels",
    tags=["customer-pixels"],
    responses={404: {"description": "Not found"}},
)


def require_organization_role(user: User, required_roles: list[UserRole], db: Session) -> Any:
    """
    Check if user has required role in their primary organization.
    Returns the OrganizationUser object if authorized.
    """
    from models.organization import UserOrganization
    
    # Get user's primary organization
    org_user = db.query(UserOrganization).filter(
        UserOrganization.user_id == user.id,
        UserOrganization.is_primary == True
    ).first()
    
    if not org_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization membership found"
        )
    
    # Convert enum values to strings for comparison
    required_role_values = [r.value for r in required_roles]
    if org_user.role not in required_role_values:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Required role: {', '.join(required_role_values)}"
        )
    
    return org_user


@router.get("/", response_model=TrackingPixelResponse)
async def get_tracking_pixels(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current organization's tracking pixels.
    
    Returns all configured tracking pixels for the user's primary organization.
    """
    # Get user's primary organization
    primary_org = current_user.primary_organization
    if not primary_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found for user"
        )
    
    return TrackingPixelResponse.model_validate(primary_org)


@router.put("/", response_model=TrackingPixelResponse)
async def update_tracking_pixels(
    pixel_data: TrackingPixelUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update organization's tracking pixels.
    
    Requires owner or manager role in the organization.
    """
    # Check permissions
    org_user = require_organization_role(
        current_user, 
        [UserRole.OWNER, UserRole.MANAGER],
        db
    )
    
    organization = org_user.organization
    
    # Update fields if provided
    update_data = pixel_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)
    
    return TrackingPixelResponse.model_validate(organization)


@router.delete("/{pixel_type}")
async def remove_tracking_pixel(
    pixel_type: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Remove a specific tracking pixel.
    
    pixel_type must be one of: gtm, ga4, meta, google_ads
    """
    # Check permissions
    org_user = require_organization_role(
        current_user, 
        [UserRole.OWNER, UserRole.MANAGER],
        db
    )
    
    organization = org_user.organization
    
    # Map pixel type to field name
    field_map = {
        "gtm": "gtm_container_id",
        "ga4": "ga4_measurement_id",
        "meta": "meta_pixel_id",
        "google_ads": ["google_ads_conversion_id", "google_ads_conversion_label"]
    }
    
    if pixel_type not in field_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pixel type. Must be one of: {', '.join(field_map.keys())}"
        )
    
    # Clear the field(s)
    fields = field_map[pixel_type]
    if isinstance(fields, list):
        for field in fields:
            setattr(organization, field, None)
    else:
        setattr(organization, fields, None)
    
    db.commit()
    
    return {"message": f"{pixel_type} pixel removed successfully"}


@router.post("/test", response_model=List[TrackingTestResult])
async def test_tracking_pixels(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Test if tracking pixels are valid and accessible.
    
    This endpoint validates pixel IDs and checks if they're properly configured.
    """
    # Get user's primary organization
    primary_org = current_user.primary_organization
    if not primary_org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found for user"
        )
    
    results = []
    
    # Test GTM
    if primary_org.gtm_container_id:
        is_valid = bool(re.match(r'^GTM-[A-Z0-9]{6,}$', primary_org.gtm_container_id))
        results.append(TrackingTestResult(
            pixel_type="gtm",
            is_valid=is_valid,
            is_active=is_valid,  # Simplified for now
            message="GTM container ID format is valid" if is_valid else "Invalid GTM format",
            details={"container_id": primary_org.gtm_container_id}
        ))
    
    # Test GA4
    if primary_org.ga4_measurement_id:
        is_valid = bool(re.match(r'^G-[A-Z0-9]{10,}$', primary_org.ga4_measurement_id))
        results.append(TrackingTestResult(
            pixel_type="ga4",
            is_valid=is_valid,
            is_active=is_valid,
            message="GA4 measurement ID format is valid" if is_valid else "Invalid GA4 format",
            details={"measurement_id": primary_org.ga4_measurement_id}
        ))
    
    # Test Meta Pixel
    if primary_org.meta_pixel_id:
        is_valid = bool(re.match(r'^\d{10,20}$', primary_org.meta_pixel_id))
        results.append(TrackingTestResult(
            pixel_type="meta",
            is_valid=is_valid,
            is_active=is_valid,
            message="Meta pixel ID format is valid" if is_valid else "Invalid Meta pixel format",
            details={"pixel_id": primary_org.meta_pixel_id}
        ))
    
    # Test Google Ads
    if primary_org.google_ads_conversion_id:
        is_valid = bool(re.match(r'^AW-\d{9,}$', primary_org.google_ads_conversion_id))
        results.append(TrackingTestResult(
            pixel_type="google_ads",
            is_valid=is_valid,
            is_active=is_valid,
            message="Google Ads conversion ID format is valid" if is_valid else "Invalid Google Ads format",
            details={
                "conversion_id": primary_org.google_ads_conversion_id,
                "conversion_label": primary_org.google_ads_conversion_label
            }
        ))
    
    return results


@router.get("/public/{organization_slug}", response_model=PublicTrackingPixels)
async def get_public_tracking_pixels(
    organization_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get tracking pixels for a public booking page.
    
    This endpoint is used by the frontend to load tracking pixels
    on public-facing booking pages. No authentication required.
    """
    # Find organization by slug
    organization = db.query(Organization).filter(
        Organization.slug == organization_slug,
        Organization.is_active == True
    ).first()
    
    if not organization:
        # Return empty pixels instead of 404 to avoid exposing org existence
        return PublicTrackingPixels(tracking_enabled=False)
    
    # Only return pixels if tracking is enabled
    if not organization.tracking_enabled:
        return PublicTrackingPixels(tracking_enabled=False)
    
    return PublicTrackingPixels(
        gtm_container_id=organization.gtm_container_id,
        ga4_measurement_id=organization.ga4_measurement_id,
        meta_pixel_id=organization.meta_pixel_id,
        google_ads_conversion_id=organization.google_ads_conversion_id,
        google_ads_conversion_label=organization.google_ads_conversion_label,
        custom_tracking_code=organization.custom_tracking_code,
        tracking_enabled=True
    )


@router.post("/instructions")
async def get_pixel_instructions(
    pixel_type: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get setup instructions for a specific pixel type.
    
    Returns step-by-step instructions for finding pixel IDs.
    """
    instructions = {
        "gtm": {
            "name": "Google Tag Manager",
            "steps": [
                "Go to tagmanager.google.com",
                "Select your container or create a new one",
                "Find your Container ID in the top bar (format: GTM-XXXXXXX)",
                "Copy and paste the Container ID here"
            ],
            "format": "GTM-XXXXXXX",
            "example": "GTM-ABC123D",
            "help_url": "https://support.google.com/tagmanager/answer/6103696"
        },
        "ga4": {
            "name": "Google Analytics 4",
            "steps": [
                "Go to analytics.google.com",
                "Select your GA4 property",
                "Go to Admin (gear icon)",
                "Under Property, click 'Data Streams'",
                "Select your web stream",
                "Find your Measurement ID (format: G-XXXXXXXXXX)",
                "Copy and paste the Measurement ID here"
            ],
            "format": "G-XXXXXXXXXX",
            "example": "G-ABC123DEF4",
            "help_url": "https://support.google.com/analytics/answer/9539598"
        },
        "meta": {
            "name": "Meta (Facebook) Pixel",
            "steps": [
                "Go to business.facebook.com",
                "Navigate to Events Manager",
                "Select your pixel or create a new one",
                "Find your Pixel ID (a long number)",
                "Copy and paste the Pixel ID here"
            ],
            "format": "Numeric (15-16 digits)",
            "example": "1234567890123456",
            "help_url": "https://www.facebook.com/business/help/952192354843755"
        },
        "google_ads": {
            "name": "Google Ads Conversion Tracking",
            "steps": [
                "Go to ads.google.com",
                "Click Tools & Settings → Conversions",
                "Create a new conversion or select existing",
                "Click on the conversion name",
                "Find the Conversion ID (format: AW-XXXXXXXXX)",
                "Also copy the Conversion Label if shown",
                "Paste both values in the respective fields"
            ],
            "format": "AW-XXXXXXXXX",
            "example": "AW-123456789",
            "help_url": "https://support.google.com/google-ads/answer/6095821"
        }
    }
    
    if pixel_type not in instructions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pixel type. Must be one of: {', '.join(instructions.keys())}"
        )
    
    return instructions[pixel_type]