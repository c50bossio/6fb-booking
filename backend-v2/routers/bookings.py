from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime
import schemas
import models
from database import get_db
from routers.auth import get_current_user
from services import booking_service

router = APIRouter(
    prefix="/bookings",
    tags=["bookings"]
)

@router.get("/slots", response_model=List[schemas.TimeSlot])
def get_available_slots(
    booking_date: date = Query(..., description="Date to check availability (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Get available time slots for a specific date."""
    # Don't allow booking in the past
    if booking_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot check slots for past dates")
    
    # Don't allow booking too far in the future (e.g., 30 days)
    if (booking_date - date.today()).days > 30:
        raise HTTPException(status_code=400, detail="Cannot book more than 30 days in advance")
    
    try:
        slots = booking_service.get_available_slots(db, booking_date)
        return slots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=schemas.BookingResponse)
def create_booking(
    booking: schemas.BookingCreate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new booking."""
    # Validate date
    if booking.date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book appointments in the past")
    
    if booking.date == date.today():
        # Check if the time has already passed today
        hour, minute = map(int, booking.time.split(":"))
        booking_datetime = datetime.combine(booking.date, datetime.min.time().replace(hour=hour, minute=minute))
        if booking_datetime <= datetime.now():
            raise HTTPException(status_code=400, detail="Cannot book appointments in the past")
    
    if (booking.date - date.today()).days > 30:
        raise HTTPException(status_code=400, detail="Cannot book more than 30 days in advance")
    
    try:
        appointment = booking_service.create_booking(
            db=db,
            user_id=current_user.id,
            booking_date=booking.date,
            booking_time=booking.time,
            service=booking.service
        )
        return appointment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=schemas.BookingListResponse)
def get_user_bookings(
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bookings for the current user."""
    bookings = booking_service.get_user_bookings(db, current_user.id)
    return {
        "bookings": bookings,
        "total": len(bookings)
    }

@router.get("/{booking_id}", response_model=schemas.BookingResponse)
def get_booking_details(
    booking_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific booking."""
    booking = booking_service.get_booking_by_id(db, booking_id, current_user.id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return booking

@router.put("/{booking_id}/cancel", response_model=schemas.BookingResponse)
def cancel_booking(
    booking_id: int,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a booking."""
    try:
        booking = booking_service.cancel_booking(db, booking_id, current_user.id)
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))