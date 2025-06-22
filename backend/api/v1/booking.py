"""
Booking API router - combines public and authenticated endpoints
"""

from fastapi import APIRouter
from .endpoints import booking_public, booking_authenticated

# Create main booking router
router = APIRouter()

# Include public endpoints
router.include_router(
    booking_public.router,
    prefix="/public",
    tags=["Booking - Public"]
)

# Include authenticated endpoints
router.include_router(
    booking_authenticated.router,
    tags=["Booking - Authenticated"]
)