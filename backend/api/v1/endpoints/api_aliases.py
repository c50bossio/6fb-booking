"""
API endpoint aliases to match documented API paths
This provides backward compatibility and better API consistency
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import RedirectResponse
from typing import Optional, List
from datetime import date

router = APIRouter()


# Booking aliases
@router.get("/booking/availability")
async def booking_availability_alias(
    barber_id: Optional[int] = Query(None),
    service_id: Optional[int] = Query(None),
    location_id: Optional[int] = Query(None),
    date_start: Optional[date] = Query(None),
    date_end: Optional[date] = Query(None),
):
    """Redirect to the actual availability endpoint"""
    if not barber_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="barber_id is required"
        )

    # Build redirect URL
    redirect_url = f"/api/v1/booking/public/barbers/{barber_id}/availability"
    params = []
    if service_id:
        params.append(f"service_id={service_id}")
    if date_start:
        params.append(f"date={date_start}")

    if params:
        redirect_url += "?" + "&".join(params)

    return RedirectResponse(url=redirect_url, status_code=307)


@router.post("/api/v1/booking/appointments")
async def booking_appointments_alias():
    """Redirect to the actual booking creation endpoint"""
    return RedirectResponse(
        url="/api/v1/booking/public/bookings/create", status_code=307
    )


# Calendar aliases
@router.post("/api/v1/calendar/sync")
async def calendar_sync_alias():
    """Calendar sync endpoint - currently returns not implemented"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Calendar sync is handled automatically through Google Calendar integration",
    )


# Payment aliases
@router.get("/api/v1/payments/methods")
async def payment_methods_alias():
    """Redirect to the actual payment methods endpoint"""
    return RedirectResponse(url="/api/v1/payments/payment-methods", status_code=307)


@router.post("/api/v1/payments/process")
async def payment_process_alias():
    """Redirect to the actual payment processing endpoint"""
    return RedirectResponse(url="/api/v1/payments/payments/confirm", status_code=307)


# Dashboard aliases
@router.get("/api/v1/dashboard/overview")
async def dashboard_overview_alias():
    """Redirect to the actual dashboard endpoint"""
    return RedirectResponse(url="/api/v1/dashboard", status_code=307)


# Public status endpoint
@router.get("/api/v1/public/status")
async def public_status():
    """Public API status endpoint"""
    return {
        "status": "operational",
        "api_version": "v1",
        "message": "6FB Booking Platform API is running",
    }


# Health check at the documented location
@router.get("/api/v1/health")
async def health_check():
    """Health check endpoint at documented location"""
    return RedirectResponse(url="/api/v1/system/health", status_code=307)


# Version endpoint
@router.get("/version")
async def get_version():
    """Get API version information"""
    import os
    from datetime import datetime

    return {
        "version": os.getenv("RELEASE_VERSION", "v1.0.0"),
        "api_version": "v1",
        "build_date": "2025-06-23",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "timestamp": datetime.utcnow().isoformat(),
    }
