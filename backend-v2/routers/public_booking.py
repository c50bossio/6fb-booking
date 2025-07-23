"""
Public booking API endpoints for organization-specific booking pages.

This module provides public endpoints for fetching organization booking data
without authentication, used by the conversion-optimized booking funnel.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime, date

from db import get_db
from models.organization import Organization
from models import User, Service
from models.guest_booking import GuestBooking
from schemas_new.tracking import PublicTrackingPixels
from schemas_new.guest_booking import (
    GuestBookingCreate,
    GuestBookingResponse,
    GuestBookingLookup,
    PublicAvailabilityResponse,
    PublicServiceInfo,
    PublicBarberInfo
)
from services.guest_booking_service import guestBookingService
from services.landing_page_service import landing_page_service
from schemas_new.landing_page import (
    LandingPageResponse,
    LandingPageTrackingEvent,
    LandingPagePresets
)
from utils.rate_limit import guest_booking_rate_limit
import logging

logger = logging.getLogger(__name__)

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


@router.get("/organization/{slug}/availability", response_model=PublicAvailabilityResponse)
@guest_booking_rate_limit
async def get_organization_availability(
    request: Request,
    slug: str,
    date: Optional[str] = None,
    service_id: Optional[int] = None,
    barber_id: Optional[int] = None,
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
    
    # Parse date or use today
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    else:
        target_date = datetime.now().date()
    
    # Get availability using service
    availability = guestBookingService.get_organization_availability(
        db=db,
        organization=organization,
        target_date=target_date,
        service_id=service_id,
        barber_id=barber_id
    )
    
    return availability


@router.post("/organization/{slug}/book", response_model=GuestBookingResponse)
@guest_booking_rate_limit
async def create_public_booking(
    request: Request,
    slug: str,
    booking_data: GuestBookingCreate,
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
    
    # Extract user agent and IP for tracking
    user_agent = request.headers.get("User-Agent")
    # Get real IP, accounting for proxies
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else None
    
    try:
        # Create guest booking
        guest_booking = guestBookingService.create_guest_booking(
            db=db,
            organization=organization,
            booking_data=booking_data,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        # Build response
        service = db.query(Service).filter(Service.id == guest_booking.service_id).first()
        barber = db.query(User).filter(User.id == guest_booking.barber_id).first() if guest_booking.barber_id else None
        
        return GuestBookingResponse(
            id=guest_booking.id,
            confirmation_code=guest_booking.confirmation_code,
            guest_name=guest_booking.guest_name,
            guest_email=guest_booking.guest_email,
            guest_phone=guest_booking.guest_phone,
            organization_id=organization.id,
            organization_name=organization.name,
            barber_id=guest_booking.barber_id,
            barber_name=barber.name if barber else None,
            service_id=guest_booking.service_id,
            service_name=service.name if service else "Service",
            appointment_datetime=guest_booking.appointment_datetime,
            appointment_timezone=guest_booking.appointment_timezone,
            duration_minutes=guest_booking.duration_minutes,
            service_price=guest_booking.service_price,
            deposit_amount=guest_booking.deposit_amount,
            status=guest_booking.status,
            payment_status=guest_booking.payment_status,
            notes=guest_booking.notes,
            marketing_consent=guest_booking.marketing_consent,
            reminder_preference=guest_booking.reminder_preference,
            created_at=guest_booking.created_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create guest booking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create booking. Please try again."
        )


@router.get("/organization/{slug}/services", response_model=List[PublicServiceInfo])
@guest_booking_rate_limit
async def get_organization_services(
    request: Request,
    slug: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get services offered by an organization.
    
    Returns a list of services available for booking.
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
    
    services = guestBookingService.get_organization_services(
        db=db,
        organization=organization,
        active_only=active_only
    )
    
    return services


@router.get("/organization/{slug}/barbers", response_model=List[PublicBarberInfo])
@guest_booking_rate_limit
async def get_organization_barbers(
    request: Request,
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Get barbers in an organization.
    
    Returns a list of barbers available for booking.
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
    
    barbers = guestBookingService.get_organization_barbers(
        db=db,
        organization=organization
    )
    
    return barbers


@router.post("/booking/lookup", response_model=GuestBookingResponse)
@guest_booking_rate_limit
async def lookup_booking(
    request: Request,
    lookup_data: GuestBookingLookup,
    db: Session = Depends(get_db)
):
    """
    Look up a guest booking by confirmation code and email/phone.
    
    Allows guests to check their booking status without an account.
    """
    guest_booking = guestBookingService.lookup_guest_booking(
        db=db,
        confirmation_code=lookup_data.confirmation_code,
        email_or_phone=lookup_data.email_or_phone
    )
    
    if not guest_booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found. Please check your confirmation code and email/phone."
        )
    
    # Build response
    service = db.query(Service).filter(Service.id == guest_booking.service_id).first()
    barber = db.query(User).filter(User.id == guest_booking.barber_id).first() if guest_booking.barber_id else None
    organization = guest_booking.organization
    
    return GuestBookingResponse(
        id=guest_booking.id,
        confirmation_code=guest_booking.confirmation_code,
        guest_name=guest_booking.guest_name,
        guest_email=guest_booking.guest_email,
        guest_phone=guest_booking.guest_phone,
        organization_id=organization.id,
        organization_name=organization.name,
        barber_id=guest_booking.barber_id,
        barber_name=barber.name if barber else None,
        service_id=guest_booking.service_id,
        service_name=service.name if service else "Service",
        appointment_datetime=guest_booking.appointment_datetime,
        appointment_timezone=guest_booking.appointment_timezone,
        duration_minutes=guest_booking.duration_minutes,
        service_price=guest_booking.service_price,
        deposit_amount=guest_booking.deposit_amount,
        status=guest_booking.status,
        payment_status=guest_booking.payment_status,
        notes=guest_booking.notes,
        marketing_consent=guest_booking.marketing_consent,
        reminder_preference=guest_booking.reminder_preference,
        created_at=guest_booking.created_at
    )


@router.post("/booking/{confirmation_code}/cancel")
@guest_booking_rate_limit
async def cancel_booking(
    request: Request,
    confirmation_code: str,
    email_or_phone: str,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Cancel a guest booking.
    
    Requires confirmation code and email/phone for security.
    """
    guest_booking = guestBookingService.lookup_guest_booking(
        db=db,
        confirmation_code=confirmation_code,
        email_or_phone=email_or_phone
    )
    
    if not guest_booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found. Please check your confirmation code and email/phone."
        )
    
    try:
        cancelled_booking = guestBookingService.cancel_guest_booking(
            db=db,
            guest_booking=guest_booking,
            reason=reason
        )
        
        return {
            "status": "cancelled",
            "message": "Your booking has been cancelled.",
            "confirmation_code": cancelled_booking.confirmation_code
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Landing Page Endpoints

@router.get("/landing/{slug}", response_model=LandingPageResponse)
@guest_booking_rate_limit
async def get_landing_page(
    request: Request,
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Get landing page data for an organization.
    
    Returns complete landing page data including testimonials,
    services, and configuration for the marketing funnel.
    """
    try:
        landing_page = await landing_page_service.get_landing_page_data(
            db=db,
            organization_slug=slug
        )
        
        if not landing_page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Landing page not found for organization '{slug}' or landing page is disabled"
            )
        
        return landing_page
        
    except Exception as e:
        logger.error(f"Failed to fetch landing page for {slug}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load landing page"
        )


@router.post("/landing/{slug}/track")
@guest_booking_rate_limit
async def track_landing_page_event(
    request: Request,
    slug: str,
    event: LandingPageTrackingEvent,
    db: Session = Depends(get_db)
):
    """
    Track landing page events for analytics.
    
    Tracks events like page views, CTA clicks, and conversions
    for landing page optimization.
    """
    try:
        # Ensure slug matches the event data
        event.organization_slug = slug
        
        # Extract additional tracking data from request
        if not event.user_agent:
            event.user_agent = request.headers.get("User-Agent")
        
        if not event.ip_address:
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                event.ip_address = forwarded_for.split(",")[0].strip()
            else:
                event.ip_address = request.client.host if request.client else None
        
        if not event.referrer:
            event.referrer = request.headers.get("Referer")
        
        # Track the event
        success = landing_page_service.track_landing_page_event(db=db, event=event)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to track event"
            )
        
        return {"status": "tracked", "event_type": event.event_type}
        
    except Exception as e:
        logger.error(f"Failed to track landing page event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track event"
        )


@router.get("/landing/presets", response_model=LandingPagePresets)
async def get_landing_page_presets():
    """
    Get available landing page presets.
    
    Returns background presets, color schemes, and testimonial templates
    for landing page customization.
    """
    return landing_page_service.get_available_presets()