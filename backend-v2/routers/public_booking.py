"""
Public booking API endpoints for organization-specific booking pages.

This module provides public endpoints for fetching organization booking data
without authentication, used by the conversion-optimized booking funnel.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel

from database import get_db
from models.organization import Organization
from models import User
from schemas_new.tracking import PublicTrackingPixels

router = APIRouter(
    prefix="/api/v1/public/booking",
    tags=["public-booking"],
    responses={404: {"description": "Not found"}},
)


class PublicOrganizationData(BaseModel):
    """Public organization data for booking pages"""
    id: int
    slug: str
    name: str
    description: Optional[str] = None
    barber_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#000000"
    accent_color: Optional[str] = "#FFD700"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = "UTC"
    business_hours: Optional[Dict[str, Any]] = None
    tracking_pixels: Optional[PublicTrackingPixels] = None


class BookingPageSettings(BaseModel):
    """Custom booking page settings"""
    welcome_message: Optional[str] = None
    show_reviews: bool = True
    show_social_proof: bool = True
    show_urgency_timer: bool = True
    custom_services: Optional[list] = None
    custom_colors: Optional[Dict[str, str]] = None


@router.get("/organization/{slug}", response_model=PublicOrganizationData)
async def get_organization_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Get public organization data by slug for booking pages.
    
    This endpoint provides the necessary data for organization-specific
    booking pages without requiring authentication.
    """
    # Fetch organization by slug
    organization = db.query(Organization).filter(
        Organization.slug == slug,
        Organization.is_active == True
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with slug '{slug}' not found"
        )
    
    # Get primary owner/barber name
    barber_name = None
    if organization.primary_owner:
        barber_name = organization.primary_owner.name
        if not barber_name:
            barber_name = organization.primary_owner.email.split('@')[0].title()
    
    # Build full address
    address_parts = []
    if organization.street_address:
        address_parts.append(organization.street_address)
    if organization.city:
        address_parts.append(organization.city)
    if organization.state:
        address_parts.append(organization.state)
    if organization.zip_code:
        address_parts.append(organization.zip_code)
    
    full_address = ", ".join(address_parts) if address_parts else None
    
    # Create tracking pixels data
    tracking_pixels = None
    if organization.tracking_enabled:
        tracking_pixels = PublicTrackingPixels(
            gtm_container_id=organization.gtm_container_id,
            ga4_measurement_id=organization.ga4_measurement_id,
            meta_pixel_id=organization.meta_pixel_id,
            google_ads_conversion_id=organization.google_ads_conversion_id,
            google_ads_conversion_label=organization.google_ads_conversion_label,
            custom_tracking_code=organization.custom_tracking_code
        )
    
    return PublicOrganizationData(
        id=organization.id,
        slug=organization.slug,
        name=organization.name,
        description=organization.description,
        barber_name=barber_name,
        logo_url=None,  # TODO: Implement logo storage
        primary_color="#000000",  # TODO: Get from custom branding
        accent_color="#FFD700",   # TODO: Get from custom branding
        phone=organization.phone,
        email=organization.email,
        address=full_address,
        website=organization.website,
        timezone=organization.timezone,
        business_hours=organization.business_hours,
        tracking_pixels=tracking_pixels
    )


@router.get("/organization/{slug}/settings", response_model=BookingPageSettings)
async def get_booking_page_settings(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Get custom booking page settings for organization.
    
    Returns customization settings like welcome messages,
    custom services, colors, etc.
    """
    organization = db.query(Organization).filter(
        Organization.slug == slug,
        Organization.is_active == True
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with slug '{slug}' not found"
        )
    
    # TODO: Implement custom booking page settings
    # For now, return default settings
    return BookingPageSettings(
        welcome_message=f"Welcome to {organization.name}",
        show_reviews=True,
        show_social_proof=True,
        show_urgency_timer=True,
        custom_services=None,
        custom_colors=None
    )


@router.get("/organization/{slug}/availability")
async def get_organization_availability(
    slug: str,
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get available time slots for organization on specific date.
    
    This endpoint provides availability data for the booking calendar
    without requiring authentication.
    """
    organization = db.query(Organization).filter(
        Organization.slug == slug,
        Organization.is_active == True
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with slug '{slug}' not found"
        )
    
    # TODO: Implement actual availability checking
    # For now, return mock availability data
    from datetime import datetime, timedelta
    
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Generate mock time slots
    mock_slots = []
    start_hour = 9  # 9 AM
    end_hour = 18   # 6 PM
    
    for hour in range(start_hour, end_hour):
        for minute in [0, 30]:  # 30-minute intervals
            time_str = f"{hour:02d}:{minute:02d}"
            mock_slots.append({
                "time": time_str,
                "available": True,
                "duration": 30
            })
    
    return {
        "date": date,
        "organization_id": organization.id,
        "slots": mock_slots,
        "timezone": organization.timezone
    }


@router.post("/organization/{slug}/book")
async def create_public_booking(
    slug: str,
    booking_data: dict,
    db: Session = Depends(get_db)
):
    """
    Create a new booking for organization (guest booking).
    
    This endpoint allows creating bookings without authentication
    for the public booking funnel.
    """
    organization = db.query(Organization).filter(
        Organization.slug == slug,
        Organization.is_active == True
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with slug '{slug}' not found"
        )
    
    # TODO: Implement actual booking creation
    # This should integrate with the existing booking system
    # but allow for guest bookings
    
    return {
        "booking_id": 12345,  # Mock booking ID
        "status": "confirmed",
        "message": "Booking created successfully",
        "organization_id": organization.id
    }