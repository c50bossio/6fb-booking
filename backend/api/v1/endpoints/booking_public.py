"""
Public booking endpoints - no authentication required
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from typing import List, Optional
from datetime import datetime, timedelta, date, time
from pydantic import BaseModel, EmailStr, Field, validator
import secrets
import string
from zoneinfo import ZoneInfo

from config.database import get_db
from models import (
    Barber,
    Service,
    ServiceCategory,
    BarberAvailability,
    Location,
    Client,
    Appointment,
    BookingRule,
    DayOfWeek,
    Review,
)
from utils.logging import log_user_action
from services.email_service import send_booking_confirmation

router = APIRouter()


# Pydantic models for request/response
class BarberPublicProfile(BaseModel):
    id: int
    first_name: str
    last_name: str
    business_name: Optional[str]
    average_rating: Optional[float]
    total_reviews: int
    bio: Optional[str]
    profile_image: Optional[str]

    class Config:
        from_attributes = True


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category_id: int
    category_name: str
    base_price: float
    min_price: Optional[float]
    max_price: Optional[float]
    duration_minutes: int
    requires_deposit: bool
    deposit_amount: Optional[float]
    deposit_type: Optional[str]
    is_addon: bool
    tags: Optional[List[str]]

    class Config:
        from_attributes = True


class TimeSlot(BaseModel):
    date: date
    start_time: time
    end_time: time
    available: bool
    reason: Optional[str] = None  # If not available, why


class AvailabilityResponse(BaseModel):
    barber_id: int
    service_id: int
    timezone: str = "America/New_York"
    slots: List[TimeSlot]


class CreateBookingRequest(BaseModel):
    barber_id: int
    service_id: int
    appointment_date: date
    appointment_time: time
    client_first_name: str = Field(..., min_length=1, max_length=100)
    client_last_name: str = Field(..., min_length=1, max_length=100)
    client_email: EmailStr
    client_phone: str = Field(..., min_length=10, max_length=20)
    notes: Optional[str] = None
    timezone: str = "America/New_York"

    @validator("appointment_date")
    def validate_future_date(cls, v):
        if v < date.today():
            raise ValueError("Appointment date must be in the future")
        return v


class BookingConfirmationResponse(BaseModel):
    booking_token: str
    appointment_id: int
    confirmation_message: str
    appointment_details: dict


# Helper functions
def generate_booking_token():
    """Generate a secure booking token"""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(32))


def get_barber_availability_for_date(
    db: Session,
    barber_id: int,
    service_id: int,
    target_date: date,
    timezone: str = "America/New_York",
) -> List[TimeSlot]:
    """Get available time slots for a barber on a specific date"""

    # Get service details
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        return []

    # Get barber's schedule for this day of week
    day_of_week = DayOfWeek(target_date.weekday())

    availability = (
        db.query(BarberAvailability)
        .filter(
            and_(
                BarberAvailability.barber_id == barber_id,
                BarberAvailability.day_of_week == day_of_week,
                BarberAvailability.is_available == True,
                or_(
                    BarberAvailability.effective_from == None,
                    BarberAvailability.effective_from <= target_date,
                ),
                or_(
                    BarberAvailability.effective_until == None,
                    BarberAvailability.effective_until >= target_date,
                ),
            )
        )
        .first()
    )

    if not availability:
        return []

    # Get existing appointments for this date
    existing_appointments = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date == target_date,
                Appointment.status.in_(["scheduled", "completed"]),
            )
        )
        .all()
    )

    # Generate time slots
    slots = []
    current_time = datetime.combine(target_date, availability.start_time)
    end_time = datetime.combine(target_date, availability.end_time)
    slot_duration = timedelta(
        minutes=service.duration_minutes + (service.buffer_minutes or 0)
    )

    # Account for break times
    break_start = (
        datetime.combine(target_date, availability.break_start)
        if availability.break_start
        else None
    )
    break_end = (
        datetime.combine(target_date, availability.break_end)
        if availability.break_end
        else None
    )

    while current_time + timedelta(minutes=service.duration_minutes) <= end_time:
        slot_end_time = current_time + timedelta(minutes=service.duration_minutes)

        # Check if slot overlaps with break
        if break_start and break_end:
            if not (slot_end_time <= break_start or current_time >= break_end):
                current_time += timedelta(minutes=15)  # Move to next 15-min interval
                continue

        # Check if slot overlaps with existing appointments
        is_available = True
        reason = None

        for appt in existing_appointments:
            appt_start = datetime.combine(
                appt.appointment_date, appt.appointment_time.time()
            )
            appt_end = appt_start + timedelta(minutes=appt.duration_minutes or 60)

            if not (slot_end_time <= appt_start or current_time >= appt_end):
                is_available = False
                reason = "Already booked"
                break

        # Check booking rules (min advance time, etc.)
        if is_available:
            min_advance_hours = service.min_advance_hours or 2
            min_booking_time = datetime.now() + timedelta(hours=min_advance_hours)

            if current_time < min_booking_time:
                is_available = False
                reason = f"Must book at least {min_advance_hours} hours in advance"

        slots.append(
            TimeSlot(
                date=target_date,
                start_time=current_time.time(),
                end_time=slot_end_time.time(),
                available=is_available,
                reason=reason,
            )
        )

        current_time += timedelta(minutes=15)  # 15-minute intervals

    return slots


# API Endpoints
@router.get("/barbers", response_model=List[BarberPublicProfile])
async def get_all_barbers(
    location_id: Optional[int] = Query(None, description="Filter by location ID"),
    db: Session = Depends(get_db)
):
    """Get all active barbers or filter by location"""
    
    # Build query with ratings
    query = (
        db.query(
            Barber,
            func.avg(Review.overall_rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .outerjoin(Review, Review.barber_id == Barber.id)
        .filter(Barber.is_active == True)
    )
    
    # Apply location filter if provided
    if location_id:
        query = query.filter(Barber.location_id == location_id)
        
    barbers = query.group_by(Barber.id).all()

    result = []
    for barber, avg_rating, review_count in barbers:
        result.append(
            BarberPublicProfile(
                id=barber.id,
                first_name=barber.first_name,
                last_name=barber.last_name,
                business_name=barber.business_name,
                average_rating=float(avg_rating) if avg_rating else None,
                total_reviews=review_count or 0,
                bio=None,  # Add bio field to Barber model if needed
                profile_image=None,  # Add profile_image field to Barber model if needed
            )
        )

    return result


@router.get("/shops/{shop_id}/barbers", response_model=List[BarberPublicProfile])
async def get_shop_barbers(shop_id: int, db: Session = Depends(get_db)):
    """Get all barbers for a specific shop/location"""

    # Verify location exists
    location = db.query(Location).filter(Location.id == shop_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Get barbers with their average ratings
    barbers = (
        db.query(
            Barber,
            func.avg(Review.overall_rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .outerjoin(Review, Review.barber_id == Barber.id)
        .filter(and_(Barber.location_id == shop_id, Barber.is_active == True))
        .group_by(Barber.id)
        .all()
    )

    result = []
    for barber, avg_rating, review_count in barbers:
        result.append(
            BarberPublicProfile(
                id=barber.id,
                first_name=barber.first_name,
                last_name=barber.last_name,
                business_name=barber.business_name,
                average_rating=float(avg_rating) if avg_rating else None,
                total_reviews=review_count or 0,
                bio=None,  # Add bio field to Barber model if needed
                profile_image=None,  # Add profile_image field to Barber model if needed
            )
        )

    return result


@router.get("/barbers/{barber_id}/services", response_model=List[ServiceResponse])
async def get_barber_services(
    barber_id: int,
    category_id: Optional[int] = None,
    is_addon: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Get services offered by a specific barber"""

    # Verify barber exists
    barber = (
        db.query(Barber)
        .filter(and_(Barber.id == barber_id, Barber.is_active == True))
        .first()
    )

    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    # Build query
    query = (
        db.query(Service, ServiceCategory.name.label("category_name"))
        .join(ServiceCategory, Service.category_id == ServiceCategory.id)
        .filter(
            and_(
                Service.is_active == True,
                or_(
                    Service.barber_id == barber_id,
                    and_(
                        Service.location_id == barber.location_id,
                        Service.barber_id == None,
                    ),
                ),
            )
        )
    )

    # Apply filters
    if category_id:
        query = query.filter(Service.category_id == category_id)

    if is_addon is not None:
        query = query.filter(Service.is_addon == is_addon)

    # Order by category and display order
    query = query.order_by(ServiceCategory.display_order, Service.display_order)

    services = query.all()

    result = []
    for service, category_name in services:
        result.append(
            ServiceResponse(
                id=service.id,
                name=service.name,
                description=service.description,
                category_id=service.category_id,
                category_name=category_name,
                base_price=service.base_price,
                min_price=service.min_price,
                max_price=service.max_price,
                duration_minutes=service.duration_minutes,
                requires_deposit=service.requires_deposit or False,
                deposit_amount=service.deposit_amount,
                deposit_type=service.deposit_type,
                is_addon=service.is_addon or False,
                tags=service.tags,
            )
        )

    return result


@router.get("/barbers/{barber_id}/availability", response_model=AvailabilityResponse)
async def get_barber_availability(
    barber_id: int,
    service_id: int,
    start_date: date = Query(..., description="Start date for availability check"),
    end_date: Optional[date] = Query(
        None, description="End date for availability check"
    ),
    timezone: str = Query("America/New_York", description="Timezone for the results"),
    db: Session = Depends(get_db),
):
    """Get available booking slots for a barber"""

    # Default to 7 days if no end date
    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Limit date range to prevent abuse
    if (end_date - start_date).days > 30:
        raise HTTPException(status_code=400, detail="Date range cannot exceed 30 days")

    # Verify barber and service exist
    barber = (
        db.query(Barber)
        .filter(and_(Barber.id == barber_id, Barber.is_active == True))
        .first()
    )

    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    service = (
        db.query(Service)
        .filter(and_(Service.id == service_id, Service.is_active == True))
        .first()
    )

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Get availability for each date
    all_slots = []
    current_date = start_date

    while current_date <= end_date:
        daily_slots = get_barber_availability_for_date(
            db, barber_id, service_id, current_date, timezone
        )
        all_slots.extend(daily_slots)
        current_date += timedelta(days=1)

    return AvailabilityResponse(
        barber_id=barber_id, service_id=service_id, timezone=timezone, slots=all_slots
    )


@router.post("/bookings/create", response_model=BookingConfirmationResponse)
async def create_booking(booking: CreateBookingRequest, db: Session = Depends(get_db)):
    """Create a new booking"""

    # Verify barber and service
    barber = (
        db.query(Barber)
        .filter(and_(Barber.id == booking.barber_id, Barber.is_active == True))
        .first()
    )

    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    service = (
        db.query(Service)
        .filter(and_(Service.id == booking.service_id, Service.is_active == True))
        .first()
    )

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check if the slot is available
    appointment_datetime = datetime.combine(
        booking.appointment_date, booking.appointment_time
    )

    # Check for existing appointments
    existing = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.barber_id == booking.barber_id,
                Appointment.appointment_date == booking.appointment_date,
                Appointment.appointment_time == appointment_datetime,
                Appointment.status.in_(["scheduled", "completed"]),
            )
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400, detail="This time slot is no longer available"
        )

    # Find or create client
    client = (
        db.query(Client)
        .filter(
            and_(
                Client.email == booking.client_email,
                Client.barber_id == booking.barber_id,
            )
        )
        .first()
    )

    if not client:
        client = Client(
            first_name=booking.client_first_name,
            last_name=booking.client_last_name,
            email=booking.client_email,
            phone=booking.client_phone,
            barber_id=booking.barber_id,
            customer_type="new",
            first_visit_date=booking.appointment_date,
            total_visits=0,
            total_spent=0.0,
        )
        db.add(client)
        db.flush()

    # Create appointment
    booking_token = generate_booking_token()

    appointment = Appointment(
        appointment_date=booking.appointment_date,
        appointment_time=appointment_datetime,
        duration_minutes=service.duration_minutes,
        barber_id=booking.barber_id,
        client_id=client.id,
        service_name=service.name,
        service_category=service.category.name if service.category else None,
        service_revenue=service.base_price,
        customer_type="new" if client.total_visits == 0 else "returning",
        status="scheduled",
        is_completed=False,
        payment_status="pending",
        booking_source="website",
        booking_time=datetime.utcnow(),
        client_notes=booking.notes,
        reference_source=booking_token,  # Store token for confirmation
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # Send confirmation email
    try:
        send_booking_confirmation(
            client_email=client.email,
            client_name=f"{client.first_name} {client.last_name}",
            barber_name=f"{barber.first_name} {barber.last_name}",
            service_name=service.name,
            appointment_date=booking.appointment_date,
            appointment_time=booking.appointment_time,
            location=barber.location.name if barber.location else "TBD",
            booking_token=booking_token,
        )
    except Exception as e:
        # Log error but don't fail the booking
        print(f"Failed to send confirmation email: {e}")

    # Log booking creation
    log_user_action(
        action="booking_created",
        user_id=None,  # Public booking
        details={
            "appointment_id": appointment.id,
            "barber_id": barber.id,
            "client_email": client.email,
            "service": service.name,
        },
    )

    return BookingConfirmationResponse(
        booking_token=booking_token,
        appointment_id=appointment.id,
        confirmation_message="Your appointment has been booked successfully!",
        appointment_details={
            "barber": f"{barber.first_name} {barber.last_name}",
            "service": service.name,
            "date": str(booking.appointment_date),
            "time": str(booking.appointment_time),
            "duration": f"{service.duration_minutes} minutes",
            "price": f"${service.base_price:.2f}",
            "location": barber.location.name if barber.location else "TBD",
        },
    )


@router.get("/bookings/confirm/{booking_token}")
async def confirm_booking(booking_token: str, db: Session = Depends(get_db)):
    """Confirm a booking using the token"""

    # Find appointment by token
    appointment = (
        db.query(Appointment)
        .filter(Appointment.reference_source == booking_token)
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Invalid booking token")

    # Get related data
    barber = appointment.barber
    client = appointment.client

    return {
        "status": "confirmed",
        "appointment": {
            "id": appointment.id,
            "date": str(appointment.appointment_date),
            "time": str(appointment.appointment_time.time()),
            "service": appointment.service_name,
            "duration": f"{appointment.duration_minutes} minutes",
            "price": f"${appointment.service_revenue:.2f}",
            "status": appointment.status,
        },
        "barber": {
            "name": f"{barber.first_name} {barber.last_name}",
            "business_name": barber.business_name,
        },
        "client": {
            "name": f"{client.first_name} {client.last_name}",
            "email": client.email,
            "phone": client.phone,
        },
        "location": {
            "name": barber.location.name if barber.location else "TBD",
            "address": barber.location.address if barber.location else None,
        },
    }
