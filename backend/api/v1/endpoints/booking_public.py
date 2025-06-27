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
import random
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
from services.availability_service import AvailabilityService
from services.stripe_service import StripeService
from models.payment import Payment, PaymentStatus

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
    barber_id: Optional[int] = None  # Optional for "Any Professional" selection
    service_id: int
    appointment_date: date
    appointment_time: time
    client_first_name: str = Field(..., min_length=1, max_length=100)
    client_last_name: str = Field(..., min_length=1, max_length=100)
    client_email: EmailStr
    client_phone: str = Field(..., min_length=10, max_length=20)
    notes: Optional[str] = None
    timezone: str = "America/New_York"
    location_id: Optional[int] = None  # Location ID for "Any Professional" selection
    payment_method: str = Field(
        default="online", description="Payment method: online, in_person"
    )
    payment_type: str = Field(
        default="full", description="Payment type: full, deposit, in_person"
    )

    @validator("appointment_date")
    def validate_future_date(cls, v):
        if v < date.today():
            raise ValueError("Appointment date must be in the future")
        return v

    @validator("payment_method")
    def validate_payment_method(cls, v):
        if v not in ["online", "in_person"]:
            raise ValueError("Payment method must be 'online' or 'in_person'")
        return v

    @validator("payment_type")
    def validate_payment_type(cls, v):
        if v not in ["full", "deposit", "in_person"]:
            raise ValueError("Payment type must be 'full', 'deposit', or 'in_person'")
        return v


class BookingConfirmationResponse(BaseModel):
    booking_token: str
    appointment_id: int
    confirmation_message: str
    appointment_details: dict
    assigned_barber: Optional[dict] = (
        None  # Include assigned barber for "Any Professional"
    )


# Helper functions
def generate_booking_token():
    """Generate a secure booking token"""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(32))


def find_available_barbers(
    db: Session,
    location_id: int,
    service_id: int,
    appointment_date: date,
    appointment_time: time,
    duration_minutes: int,
) -> List[Barber]:
    """Find all barbers available for a specific service at a given time"""

    # Get all active barbers at the location who offer the service
    barbers = (
        db.query(Barber)
        .filter(
            and_(
                Barber.location_id == location_id,
                Barber.is_active == True,
            )
        )
        .all()
    )

    # Filter by those who offer the service
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        return []

    # If service is location-wide (no specific barber), all barbers can perform it
    # If service is barber-specific, only that barber can perform it
    if service.barber_id:
        barbers = [b for b in barbers if b.id == service.barber_id]

    # Check availability for each barber
    availability_service = AvailabilityService(db)
    available_barbers = []

    for barber in barbers:
        is_available, conflicts = availability_service.check_real_time_availability(
            barber_id=barber.id,
            appointment_date=appointment_date,
            start_time=appointment_time,
            duration_minutes=duration_minutes,
        )

        if is_available:
            available_barbers.append(barber)

    return available_barbers


def generate_mock_availability_slots(
    target_date: date, service: Service, timezone: str = "America/New_York"
) -> List[TimeSlot]:
    """Generate mock availability slots for testing when no real availability exists"""

    slots = []

    # Define business hours (9 AM to 5 PM)
    start_hour = 9
    end_hour = 17  # 5 PM in 24-hour format

    # Generate slots with 30-minute intervals
    current_time = datetime.combine(target_date, time(hour=start_hour, minute=0))
    end_time = datetime.combine(target_date, time(hour=end_hour, minute=0))

    # Generate a lunch break (12 PM to 1 PM)
    lunch_start = datetime.combine(target_date, time(hour=12, minute=0))
    lunch_end = datetime.combine(target_date, time(hour=13, minute=0))

    while current_time + timedelta(minutes=service.duration_minutes) <= end_time:
        slot_end_time = current_time + timedelta(minutes=service.duration_minutes)

        # Skip lunch break
        if not (slot_end_time <= lunch_start or current_time >= lunch_end):
            current_time += timedelta(minutes=30)
            continue

        # Randomly make some slots unavailable (30% chance)
        is_available = True
        reason = None

        # Check if slot is in the past
        min_advance_hours = getattr(service, "min_advance_hours", 2) or 2
        min_booking_time = datetime.now() + timedelta(hours=min_advance_hours)

        if current_time < min_booking_time:
            is_available = False
            reason = f"Must book at least {min_advance_hours} hours in advance"
        elif random.random() < 0.3:  # 30% chance of being booked
            is_available = False
            reason = "Already booked"

        # Add some variety to unavailable slots
        if is_available and current_time.hour in [10, 14, 16] and random.random() < 0.5:
            # Popular times are more likely to be booked
            is_available = False
            reason = "Already booked"

        slots.append(
            TimeSlot(
                date=target_date,
                start_time=current_time.time(),
                end_time=slot_end_time.time(),
                available=is_available,
                reason=reason,
            )
        )

        current_time += timedelta(minutes=30)  # 30-minute intervals

    return slots


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
        # Generate mock data for testing
        return generate_mock_availability_slots(target_date, service, timezone)

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
        minutes=service.duration_minutes + 15  # Default 15 min buffer
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
    db: Session = Depends(get_db),
):
    """Get all active barbers or filter by location"""

    try:
        # Simple query first - get barbers without ratings to avoid join issues
        query = db.query(Barber).filter(Barber.is_active == True)

        # Apply location filter if provided
        if location_id:
            query = query.filter(Barber.location_id == location_id)

        barbers = query.all()

        result = []
        for barber in barbers:
            result.append(
                BarberPublicProfile(
                    id=barber.id,
                    first_name=barber.first_name,
                    last_name=barber.last_name,
                    business_name=barber.business_name,
                    average_rating=None,  # Will add rating calculation later
                    total_reviews=0,  # Will add review count later
                    bio=None,  # Add bio field to Barber model if needed
                    profile_image=None,  # Add profile_image field to Barber model if needed
                )
            )

        return result

    except Exception as e:
        # Log the error for debugging
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching barbers: {str(e)}")

        # Return empty list if database has no data yet
        return []


class LocationPublicInfo(BaseModel):
    id: int
    name: str
    location_code: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    email: str
    operating_hours: Optional[dict]
    is_active: bool
    timezone: Optional[str] = "America/New_York"

    class Config:
        from_attributes = True


@router.get("/shops", response_model=List[LocationPublicInfo])
async def get_all_shops(
    is_active: bool = Query(True, description="Filter by active status"),
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    db: Session = Depends(get_db),
):
    """Get all public shops/locations"""

    query = db.query(Location)

    if is_active is not None:
        query = query.filter(Location.is_active == is_active)

    if city:
        query = query.filter(Location.city == city)

    if state:
        query = query.filter(Location.state == state)

    locations = query.all()

    result = []
    for location in locations:
        # Parse operating_hours if it's a string
        operating_hours = location.operating_hours
        if isinstance(operating_hours, str):
            try:
                import json

                operating_hours = json.loads(operating_hours)
            except:
                operating_hours = {}
        elif operating_hours is None:
            operating_hours = {}

        result.append(
            LocationPublicInfo(
                id=location.id,
                name=location.name,
                location_code=location.location_code,
                address=location.address,
                city=location.city,
                state=location.state,
                zip_code=location.zip_code,
                phone=location.phone,
                email=location.email,
                operating_hours=operating_hours,
                is_active=location.is_active,
                timezone=getattr(location, "timezone", "America/New_York"),
            )
        )

    return result


class LocationPaymentSettings(BaseModel):
    pay_in_person_enabled: bool
    pay_in_person_message: Optional[str]
    accepts_cash: bool
    accepts_credit_card: bool
    accepts_digital_wallet: bool
    requires_deposit: bool
    deposit_percentage: Optional[float]
    deposit_fixed_amount: Optional[float]

    class Config:
        from_attributes = True


@router.get("/shops/{shop_id}/payment-settings", response_model=LocationPaymentSettings)
async def get_shop_payment_settings(shop_id: int, db: Session = Depends(get_db)):
    """Get payment settings for a specific shop/location"""

    location = (
        db.query(Location)
        .filter(and_(Location.id == shop_id, Location.is_active == True))
        .first()
    )

    if not location:
        raise HTTPException(status_code=404, detail="Shop not found or not active")

    return LocationPaymentSettings(
        pay_in_person_enabled=location.pay_in_person_enabled,
        pay_in_person_message=location.pay_in_person_message,
        accepts_cash=location.accepts_cash,
        accepts_credit_card=location.accepts_credit_card,
        accepts_digital_wallet=location.accepts_digital_wallet,
        requires_deposit=location.requires_deposit,
        deposit_percentage=location.deposit_percentage,
        deposit_fixed_amount=location.deposit_fixed_amount,
    )


@router.get("/shops/{shop_id}", response_model=LocationPublicInfo)
async def get_shop_info(shop_id: int, db: Session = Depends(get_db)):
    """Get public information about a shop/location"""

    location = (
        db.query(Location)
        .filter(and_(Location.id == shop_id, Location.is_active == True))
        .first()
    )

    if not location:
        raise HTTPException(status_code=404, detail="Shop not found or not active")

    # Parse operating_hours if it's a string
    operating_hours = location.operating_hours
    if isinstance(operating_hours, str):
        try:
            import json

            operating_hours = json.loads(operating_hours)
        except:
            operating_hours = {}
    elif operating_hours is None:
        operating_hours = {}

    return LocationPublicInfo(
        id=location.id,
        name=location.name,
        location_code=location.location_code,
        address=location.address,
        city=location.city,
        state=location.state,
        zip_code=location.zip_code,
        phone=location.phone,
        email=location.email,
        operating_hours=operating_hours,
        is_active=location.is_active,
        timezone=getattr(location, "timezone", "America/New_York"),
    )


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


@router.get("/shops/{shop_id}/services", response_model=List[ServiceResponse])
async def get_shop_services(
    shop_id: int,
    category_id: Optional[int] = None,
    is_addon: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Get all services available at a specific shop/location"""

    # Verify location exists
    location = db.query(Location).filter(Location.id == shop_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Build query for services available at this location
    query = (
        db.query(Service, ServiceCategory.name.label("category_name"))
        .join(ServiceCategory, Service.category_id == ServiceCategory.id)
        .filter(
            and_(
                Service.is_active == True,
                Service.location_id == shop_id,
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


@router.get("/locations/{location_id}/any-professional-availability")
async def get_any_professional_availability(
    location_id: int,
    service_id: int,
    date: date = Query(..., description="Date to check availability"),
    timezone: str = Query("America/New_York", description="Timezone for the results"),
    db: Session = Depends(get_db),
):
    """Get availability for 'Any Professional' at a location for a specific service and date"""

    # Verify location exists
    location = (
        db.query(Location)
        .filter(and_(Location.id == location_id, Location.is_active == True))
        .first()
    )

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Get service
    service = (
        db.query(Service)
        .filter(and_(Service.id == service_id, Service.is_active == True))
        .first()
    )

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Get all barbers at the location
    barbers = (
        db.query(Barber)
        .filter(
            and_(
                Barber.location_id == location_id,
                Barber.is_active == True,
            )
        )
        .all()
    )

    # If service is barber-specific, filter to only that barber
    if service.barber_id:
        barbers = [b for b in barbers if b.id == service.barber_id]

    # Collect all available time slots across all barbers
    all_time_slots = {}

    for barber in barbers:
        # Get availability for this barber
        slots = get_barber_availability_for_date(
            db=db,
            barber_id=barber.id,
            service_id=service_id,
            target_date=date,
            timezone=timezone,
        )

        # Merge slots - a time is available if ANY barber is available
        for slot in slots:
            slot_key = (slot.start_time, slot.end_time)

            if slot_key not in all_time_slots:
                all_time_slots[slot_key] = {
                    "date": slot.date,
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                    "available": slot.available,
                    "available_barbers": [],
                    "reason": slot.reason,
                }

            # If this barber is available for this slot, mark it as available
            if slot.available:
                all_time_slots[slot_key]["available"] = True
                all_time_slots[slot_key]["available_barbers"].append(barber.id)
                all_time_slots[slot_key]["reason"] = None

    # Convert to list of TimeSlot objects
    result_slots = []
    for slot_data in all_time_slots.values():
        result_slots.append(
            TimeSlot(
                date=slot_data["date"],
                start_time=slot_data["start_time"],
                end_time=slot_data["end_time"],
                available=slot_data["available"],
                reason=slot_data["reason"] if not slot_data["available"] else None,
            )
        )

    # Sort by start time
    result_slots.sort(key=lambda x: x.start_time)

    return {
        "location_id": location_id,
        "service_id": service_id,
        "timezone": timezone,
        "date": str(date),
        "slots": result_slots,
        "total_available_slots": sum(1 for s in result_slots if s.available),
        "message": "Showing combined availability for all professionals at this location",
    }


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
    """Get available booking slots for a barber

    Returns mock data if no real availability is configured for testing purposes.
    Mock data includes:
    - Business hours: 9 AM to 5 PM
    - 30-minute time slots
    - Lunch break: 12 PM to 1 PM
    - Random unavailable slots to simulate bookings
    """

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

    # Get available slots for each day in the range
    all_slots = []
    current_date = start_date

    while current_date <= end_date:
        # Get slots using the helper function
        daily_slots = get_barber_availability_for_date(
            db=db,
            barber_id=barber_id,
            service_id=service_id,
            target_date=current_date,
            timezone=timezone,
        )

        all_slots.extend(daily_slots)
        current_date += timedelta(days=1)

    return AvailabilityResponse(
        barber_id=barber_id, service_id=service_id, timezone=timezone, slots=all_slots
    )


@router.post("/bookings/create", response_model=BookingConfirmationResponse)
async def create_booking(booking: CreateBookingRequest, db: Session = Depends(get_db)):
    """Create a new booking"""

    # Handle "Any Professional" selection
    assigned_barber_info = None

    if booking.barber_id is None:
        # "Any Professional" selected - need to find and assign a barber
        if not booking.location_id:
            raise HTTPException(
                status_code=400,
                detail="Location ID is required when selecting 'Any Professional'",
            )

        # Get service to check duration
        service = (
            db.query(Service)
            .filter(and_(Service.id == booking.service_id, Service.is_active == True))
            .first()
        )

        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        # Find available barbers
        available_barbers = find_available_barbers(
            db=db,
            location_id=booking.location_id,
            service_id=booking.service_id,
            appointment_date=booking.appointment_date,
            appointment_time=booking.appointment_time,
            duration_minutes=service.duration_minutes,
        )

        if not available_barbers:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "No professionals are available at the selected time",
                    "suggested_action": "Please select a different time or choose a specific professional",
                },
            )

        # Randomly select one of the available barbers
        selected_barber = random.choice(available_barbers)
        booking.barber_id = selected_barber.id

        # Store info about the assigned barber for the response
        assigned_barber_info = {
            "id": selected_barber.id,
            "name": f"{selected_barber.first_name} {selected_barber.last_name}",
            "business_name": selected_barber.business_name,
            "message": "We've assigned you a great professional!",
        }

    # Verify barber exists (for both specific selection and auto-assignment)
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

    # Real-time availability check
    availability_service = AvailabilityService(db)
    is_available, conflicts = availability_service.check_real_time_availability(
        barber_id=booking.barber_id,
        appointment_date=booking.appointment_date,
        start_time=booking.appointment_time,
        duration_minutes=service.duration_minutes,
    )

    if not is_available:
        conflict_messages = [c.message for c in conflicts]
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Time slot is not available",
                "conflicts": conflict_messages,
                "suggested_action": "Please select a different time slot",
            },
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
    appointment_datetime = datetime.combine(
        booking.appointment_date, booking.appointment_time
    )

    # Set payment status based on payment method
    payment_status = "pending"
    if booking.payment_method == "in_person":
        payment_status = "pending_in_person"
    elif booking.payment_type == "deposit":
        payment_status = "deposit_pending"

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
        payment_status=payment_status,
        payment_method=booking.payment_method,
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

    # Customize confirmation message if barber was auto-assigned
    confirmation_msg = "Your appointment has been booked successfully!"
    if assigned_barber_info:
        confirmation_msg = f"Your appointment has been booked successfully! {assigned_barber_info['message']}"

    # Include payment information in appointment details
    payment_info = {}
    if booking.payment_method == "in_person":
        payment_info = {
            "payment_method": "Pay in Person",
            "payment_status": "No online payment required",
            "payment_instructions": "Payment is due when you arrive at the shop. We accept cash, credit/debit cards, and digital wallets.",
        }
    elif booking.payment_type == "deposit":
        deposit_amount = service.deposit_amount or (service.base_price * 0.5)
        payment_info = {
            "payment_method": "Deposit Required",
            "payment_status": "Deposit payment pending",
            "deposit_amount": f"${deposit_amount:.2f}",
            "remaining_amount": f"${service.base_price - deposit_amount:.2f}",
        }
    else:
        payment_info = {
            "payment_method": "Full Payment",
            "payment_status": "Payment pending",
            "amount": f"${service.base_price:.2f}",
        }

    return BookingConfirmationResponse(
        booking_token=booking_token,
        appointment_id=appointment.id,
        confirmation_message=confirmation_msg,
        appointment_details={
            "barber": f"{barber.first_name} {barber.last_name}",
            "service": service.name,
            "date": str(booking.appointment_date),
            "time": str(booking.appointment_time),
            "duration": f"{service.duration_minutes} minutes",
            "price": f"${service.base_price:.2f}",
            "location": barber.location.name if barber.location else "TBD",
            "payment": payment_info,
        },
        assigned_barber=assigned_barber_info,
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


# Public Payment Schemas
class PublicPaymentIntentCreate(BaseModel):
    """Schema for creating a payment intent in public booking flow"""

    appointment_id: int
    amount: int = Field(..., gt=0, description="Amount in cents")
    metadata: Optional[dict] = Field(default_factory=dict)


class PublicPaymentIntentResponse(BaseModel):
    """Schema for public payment intent response"""

    client_secret: str
    payment_intent_id: str
    amount: int
    requires_action: bool
    status: str


class PublicPaymentConfirm(BaseModel):
    """Schema for confirming a payment in public booking"""

    payment_intent_id: str
    payment_method_id: Optional[str] = None


class PublicPaymentResponse(BaseModel):
    """Schema for public payment response"""

    payment_id: int
    status: str
    amount: int
    paid_at: Optional[datetime]


# Public Payment Endpoints
@router.post("/payments/create-intent", response_model=PublicPaymentIntentResponse)
async def create_public_payment_intent(
    payment_data: PublicPaymentIntentCreate,
    db: Session = Depends(get_db),
):
    """Create a payment intent for public booking (no authentication required)"""

    # Verify appointment exists
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == payment_data.appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify appointment is in correct status for payment
    if appointment.status not in ["scheduled"]:
        raise HTTPException(
            status_code=400, detail="Appointment is not in a valid state for payment"
        )

    # Check if payment already exists and is successful
    existing_payment = (
        db.query(Payment)
        .filter(
            Payment.appointment_id == appointment.id,
            Payment.status == PaymentStatus.SUCCEEDED,
        )
        .first()
    )

    if existing_payment:
        raise HTTPException(status_code=400, detail="Appointment is already paid")

    # Validate payment amount matches service cost
    expected_amount = (
        int(appointment.service_revenue * 100) if appointment.service_revenue else 0
    )
    if payment_data.amount != expected_amount:
        raise HTTPException(
            status_code=400, detail=f"Payment amount must be ${expected_amount/100:.2f}"
        )

    try:
        # Create a dummy user for the public payment
        # In real implementation, you might want to handle this differently
        stripe_service = StripeService(db)

        # Create payment intent without user authentication
        import stripe

        # Get the barber to access their Stripe account
        barber = appointment.barber
        if not barber:
            raise HTTPException(
                status_code=400,
                detail="Barber information not found for this appointment",
            )

        # Create payment intent with Stripe
        payment_intent = stripe.PaymentIntent.create(
            amount=payment_data.amount,
            currency="usd",
            payment_method_types=["card"],
            metadata={
                "appointment_id": str(appointment.id),
                "barber_id": str(barber.id),
                "service_name": appointment.service_name or "",
                "booking_type": "public",
                **payment_data.metadata,
            },
            description=f"Payment for {appointment.service_name} appointment",
        )

        # Create payment record in database
        payment = Payment(
            appointment_id=appointment.id,
            user_id=None,  # No user for public bookings
            amount=payment_data.amount,
            currency="usd",
            status=PaymentStatus.PENDING,
            stripe_payment_intent_id=payment_intent.id,
            description=f"Payment for {appointment.service_name}",
        )

        db.add(payment)
        db.commit()
        db.refresh(payment)

        return PublicPaymentIntentResponse(
            client_secret=payment_intent.client_secret,
            payment_intent_id=payment_intent.id,
            amount=payment_data.amount,
            requires_action=payment_intent.status == "requires_action",
            status=payment_intent.status,
        )

    except Exception as e:
        logger.error(f"Failed to create public payment intent: {str(e)}")
        raise HTTPException(
            status_code=400, detail="Unable to create payment intent. Please try again."
        )


@router.post("/payments/confirm", response_model=PublicPaymentResponse)
async def confirm_public_payment(
    confirm_data: PublicPaymentConfirm,
    db: Session = Depends(get_db),
):
    """Confirm a payment for public booking"""

    try:
        # Find payment by Stripe payment intent ID
        payment = (
            db.query(Payment)
            .filter(Payment.stripe_payment_intent_id == confirm_data.payment_intent_id)
            .first()
        )

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        # Retrieve payment intent from Stripe to check status
        import stripe

        payment_intent = stripe.PaymentIntent.retrieve(confirm_data.payment_intent_id)

        if payment_intent.status == "succeeded":
            payment.status = PaymentStatus.SUCCEEDED
            payment.paid_at = datetime.utcnow()

            # Update appointment payment status
            if payment.appointment:
                payment.appointment.payment_status = "completed"

            db.commit()
            db.refresh(payment)

            return PublicPaymentResponse(
                payment_id=payment.id,
                status=payment.status.value,
                amount=payment.amount,
                paid_at=payment.paid_at,
            )
        else:
            # Payment not successful
            if payment_intent.status == "requires_action":
                payment.status = PaymentStatus.REQUIRES_ACTION
            else:
                payment.status = PaymentStatus.FAILED

            db.commit()

            raise HTTPException(
                status_code=400,
                detail=f"Payment not successful. Status: {payment_intent.status}",
            )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error in payment confirmation: {str(e)}")
        raise HTTPException(
            status_code=400, detail="Payment confirmation failed. Please try again."
        )
    except Exception as e:
        logger.error(f"Error confirming public payment: {str(e)}")
        raise HTTPException(
            status_code=400, detail="Payment confirmation failed. Please try again."
        )


@router.get("/payments/status/{appointment_id}")
async def get_public_payment_status(
    appointment_id: int,
    db: Session = Depends(get_db),
):
    """Get payment status for an appointment"""

    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Find existing payment
    payment = (
        db.query(Payment)
        .filter(Payment.appointment_id == appointment_id)
        .order_by(Payment.created_at.desc())
        .first()
    )

    # Determine if payment is required
    payment_required = appointment.payment_status not in [
        "completed",
        "paid",
        "pending_in_person",
    ]

    result = {
        "payment_required": payment_required,
        "payment_status": appointment.payment_status or "pending",
        "appointment_id": appointment_id,
    }

    if payment:
        result.update(
            {
                "amount": payment.amount,
                "payment_intent": payment.stripe_payment_intent_id,
                "payment_id": payment.id,
            }
        )
    elif appointment.service_revenue:
        result["amount"] = int(appointment.service_revenue * 100)

    return result
