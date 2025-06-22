"""
Authenticated booking endpoints - require JWT authentication
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from typing import List, Optional
from datetime import datetime, timedelta, date, time
from pydantic import BaseModel, Field, validator
import json

from config.database import get_db
from models import (
    User,
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
    ReviewRating,
)
from api.v1.auth import get_current_user
from utils.logging import log_user_action
from services.rbac_service import RBACService, require_permission

router = APIRouter()


# Pydantic models
class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category_id: int
    base_price: float = Field(..., gt=0)
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    duration_minutes: int = Field(..., gt=0, le=480)  # Max 8 hours
    buffer_minutes: int = Field(default=0, ge=0, le=60)
    requires_deposit: bool = False
    deposit_type: Optional[str] = Field(None, pattern="^(percentage|fixed)$")
    deposit_amount: Optional[float] = Field(None, ge=0)
    is_addon: bool = False
    can_overlap: bool = False
    max_advance_days: int = Field(default=90, ge=1, le=365)
    min_advance_hours: int = Field(default=2, ge=0, le=168)
    is_featured: bool = False
    tags: Optional[List[str]] = None

    @validator("deposit_amount")
    def validate_deposit(cls, v, values):
        if values.get("requires_deposit") and not v:
            raise ValueError("Deposit amount required when deposit is enabled")
        if values.get("deposit_type") == "percentage" and v and v > 100:
            raise ValueError("Percentage deposit cannot exceed 100%")
        return v

    @validator("max_price")
    def validate_price_range(cls, v, values):
        if v and values.get("min_price") and v < values["min_price"]:
            raise ValueError("Max price must be greater than min price")
        return v


class ServiceUpdate(ServiceCreate):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[int] = None
    base_price: Optional[float] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, gt=0, le=480)


class AvailabilityCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    is_available: bool = True
    max_bookings: Optional[int] = Field(None, gt=0)
    effective_from: Optional[date] = None
    effective_until: Optional[date] = None

    @validator("end_time")
    def validate_times(cls, v, values):
        if values.get("start_time") and v <= values["start_time"]:
            raise ValueError("End time must be after start time")
        return v

    @validator("break_end")
    def validate_break_times(cls, v, values):
        if v and values.get("break_start"):
            if v <= values["break_start"]:
                raise ValueError("Break end must be after break start")
            if values.get("start_time") and values.get("end_time"):
                if (
                    values["break_start"] < values["start_time"]
                    or v > values["end_time"]
                ):
                    raise ValueError("Break times must be within work hours")
        return v


class CalendarFilter(BaseModel):
    start_date: date
    end_date: date
    barber_id: Optional[int] = None
    location_id: Optional[int] = None
    service_id: Optional[int] = None
    status: Optional[str] = None

    @validator("end_date")
    def validate_date_range(cls, v, values):
        if values.get("start_date") and v < values["start_date"]:
            raise ValueError("End date must be after start date")
        if values.get("start_date") and (v - values["start_date"]).days > 90:
            raise ValueError("Date range cannot exceed 90 days")
        return v


class ReviewCreate(BaseModel):
    appointment_id: int
    overall_rating: int = Field(..., ge=1, le=5)
    service_rating: Optional[int] = Field(None, ge=1, le=5)
    cleanliness_rating: Optional[int] = Field(None, ge=1, le=5)
    punctuality_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = None
    photos: Optional[List[str]] = None


# Service Management Endpoints
@router.post("/services/create", status_code=201)
async def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new service (barber or admin only)"""

    # Check permissions
    rbac = RBACService(db)
    if not rbac.check_permission(current_user, "services.create"):
        raise HTTPException(status_code=403, detail="Not authorized to create services")

    # Get barber profile
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only barbers can create services")

    # Verify category exists
    category = (
        db.query(ServiceCategory)
        .filter(ServiceCategory.id == service_data.category_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Service category not found")

    # Create service
    service = Service(
        name=service_data.name,
        description=service_data.description,
        category_id=service_data.category_id,
        base_price=service_data.base_price,
        min_price=service_data.min_price,
        max_price=service_data.max_price,
        duration_minutes=service_data.duration_minutes,
        buffer_minutes=service_data.buffer_minutes,
        requires_deposit=service_data.requires_deposit,
        deposit_type=service_data.deposit_type,
        deposit_amount=service_data.deposit_amount,
        is_addon=service_data.is_addon,
        can_overlap=service_data.can_overlap,
        max_advance_days=service_data.max_advance_days,
        min_advance_hours=service_data.min_advance_hours,
        is_featured=service_data.is_featured,
        tags=service_data.tags,
        barber_id=barber.id if barber else None,
        location_id=barber.location_id if barber else None,
        is_active=True,
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    # Log action
    log_user_action(
        action="service_created",
        user_id=current_user.id,
        details={
            "service_id": service.id,
            "service_name": service.name,
            "price": service.base_price,
        },
    )

    return {
        "message": "Service created successfully",
        "service": {
            "id": service.id,
            "name": service.name,
            "category": category.name,
            "price": service.base_price,
            "duration": service.duration_minutes,
        },
    }


@router.put("/services/{service_id}/update")
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a service"""

    # Get service
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check permissions
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()

    if current_user.role != "admin":
        if not barber or service.barber_id != barber.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to update this service"
            )

    # Update fields
    update_data = service_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    service.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(service)

    # Log action
    log_user_action(
        action="service_updated",
        user_id=current_user.id,
        details={"service_id": service.id, "updates": list(update_data.keys())},
    )

    return {
        "message": "Service updated successfully",
        "service": {
            "id": service.id,
            "name": service.name,
            "price": service.base_price,
            "duration": service.duration_minutes,
        },
    }


@router.delete("/services/{service_id}")
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete (deactivate) a service"""

    # Get service
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check permissions
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()

    if current_user.role != "admin":
        if not barber or service.barber_id != barber.id:
            raise HTTPException(
                status_code=403, detail="Not authorized to delete this service"
            )

    # Check for future appointments
    future_appointments = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.service_name == service.name,
                Appointment.appointment_date >= date.today(),
                Appointment.status == "scheduled",
            )
        )
        .count()
    )

    if future_appointments > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete service with {future_appointments} future appointments",
        )

    # Soft delete
    service.is_active = False
    service.updated_at = datetime.utcnow()
    db.commit()

    # Log action
    log_user_action(
        action="service_deleted",
        user_id=current_user.id,
        details={"service_id": service.id, "service_name": service.name},
    )

    return {"message": "Service deleted successfully"}


# Schedule Management
@router.get("/barbers/{barber_id}/schedule")
async def get_barber_schedule(
    barber_id: int,
    start_date: date = Query(...),
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get barber's full schedule including appointments and availability"""

    # Check permissions
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    # Only barber themselves or admin can view full schedule
    if current_user.role != "admin":
        user_barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not user_barber or user_barber.id != barber_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to view this schedule"
            )

    if not end_date:
        end_date = start_date + timedelta(days=7)

    # Get availability patterns
    availability = (
        db.query(BarberAvailability)
        .filter(
            and_(
                BarberAvailability.barber_id == barber_id,
                BarberAvailability.is_available == True,
                or_(
                    BarberAvailability.effective_from == None,
                    BarberAvailability.effective_from <= end_date,
                ),
                or_(
                    BarberAvailability.effective_until == None,
                    BarberAvailability.effective_until >= start_date,
                ),
            )
        )
        .all()
    )

    # Get appointments
    appointments = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status.in_(["scheduled", "completed"]),
            )
        )
        .order_by(Appointment.appointment_date, Appointment.appointment_time)
        .all()
    )

    # Format schedule
    schedule = {
        "barber": {
            "id": barber.id,
            "name": f"{barber.first_name} {barber.last_name}",
            "business_name": barber.business_name,
        },
        "date_range": {"start": str(start_date), "end": str(end_date)},
        "availability_patterns": [],
        "appointments": [],
    }

    # Add availability patterns
    for avail in availability:
        schedule["availability_patterns"].append(
            {
                "day_of_week": avail.day_of_week.name,
                "start_time": str(avail.start_time),
                "end_time": str(avail.end_time),
                "break_start": str(avail.break_start) if avail.break_start else None,
                "break_end": str(avail.break_end) if avail.break_end else None,
                "max_bookings": avail.max_bookings,
                "effective_from": (
                    str(avail.effective_from) if avail.effective_from else None
                ),
                "effective_until": (
                    str(avail.effective_until) if avail.effective_until else None
                ),
            }
        )

    # Add appointments
    for appt in appointments:
        schedule["appointments"].append(
            {
                "id": appt.id,
                "date": str(appt.appointment_date),
                "time": str(appt.appointment_time.time()),
                "duration": appt.duration_minutes,
                "client": appt.client.full_name,
                "service": appt.service_name,
                "revenue": appt.total_revenue,
                "status": appt.status,
            }
        )

    return schedule


@router.post("/barbers/{barber_id}/availability")
async def set_barber_availability(
    barber_id: int,
    availability_data: List[AvailabilityCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set barber's availability schedule"""

    # Check permissions
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    # Only barber themselves or admin can set availability
    if current_user.role != "admin":
        user_barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not user_barber or user_barber.id != barber_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to set this availability"
            )

    # Process each availability entry
    created_count = 0
    for avail in availability_data:
        # Check for existing entry
        existing = (
            db.query(BarberAvailability)
            .filter(
                and_(
                    BarberAvailability.barber_id == barber_id,
                    BarberAvailability.location_id == barber.location_id,
                    BarberAvailability.day_of_week == DayOfWeek(avail.day_of_week),
                    BarberAvailability.start_time == avail.start_time,
                )
            )
            .first()
        )

        if existing:
            # Update existing
            for field, value in avail.dict().items():
                if field != "day_of_week":  # Handle enum separately
                    setattr(existing, field, value)
            existing.updated_at = datetime.utcnow()
        else:
            # Create new
            new_availability = BarberAvailability(
                barber_id=barber_id,
                location_id=barber.location_id,
                day_of_week=DayOfWeek(avail.day_of_week),
                start_time=avail.start_time,
                end_time=avail.end_time,
                break_start=avail.break_start,
                break_end=avail.break_end,
                is_available=avail.is_available,
                max_bookings=avail.max_bookings,
                effective_from=avail.effective_from,
                effective_until=avail.effective_until,
            )
            db.add(new_availability)
            created_count += 1

    db.commit()

    # Log action
    log_user_action(
        action="availability_updated",
        user_id=current_user.id,
        details={
            "barber_id": barber_id,
            "entries_updated": len(availability_data),
            "new_entries": created_count,
        },
    )

    return {
        "message": "Availability updated successfully",
        "entries_processed": len(availability_data),
        "new_entries": created_count,
    }


# Booking Calendar
@router.get("/bookings/calendar")
async def get_booking_calendar(
    filters: CalendarFilter = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get booking calendar view"""

    # Build base query
    query = db.query(Appointment).filter(
        and_(
            Appointment.appointment_date >= filters.start_date,
            Appointment.appointment_date <= filters.end_date,
        )
    )

    # Apply filters based on user role
    if current_user.role == "barber":
        # Barbers can only see their own appointments
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(status_code=403, detail="Barber profile not found")
        query = query.filter(Appointment.barber_id == barber.id)

    elif current_user.role == "manager":
        # Managers can see appointments for their location
        if current_user.primary_location_id:
            query = query.join(Barber).filter(
                Barber.location_id == current_user.primary_location_id
            )
        elif filters.location_id:
            query = query.join(Barber).filter(Barber.location_id == filters.location_id)

    # Apply additional filters
    if filters.barber_id and current_user.role in ["admin", "manager"]:
        query = query.filter(Appointment.barber_id == filters.barber_id)

    if filters.service_id:
        service = db.query(Service).filter(Service.id == filters.service_id).first()
        if service:
            query = query.filter(Appointment.service_name == service.name)

    if filters.status:
        query = query.filter(Appointment.status == filters.status)

    # Get appointments
    appointments = query.order_by(
        Appointment.appointment_date, Appointment.appointment_time
    ).all()

    # Group by date
    calendar = {}
    for appt in appointments:
        date_str = str(appt.appointment_date)
        if date_str not in calendar:
            calendar[date_str] = []

        calendar[date_str].append(
            {
                "id": appt.id,
                "time": str(appt.appointment_time.time()),
                "duration": appt.duration_minutes,
                "barber": f"{appt.barber.first_name} {appt.barber.last_name}",
                "client": appt.client.full_name,
                "service": appt.service_name,
                "revenue": appt.total_revenue,
                "status": appt.status,
                "customer_type": appt.customer_type,
            }
        )

    # Calculate summary stats
    total_appointments = len(appointments)
    total_revenue = sum(appt.total_revenue for appt in appointments)
    completed = sum(1 for appt in appointments if appt.status == "completed")

    return {
        "date_range": {"start": str(filters.start_date), "end": str(filters.end_date)},
        "summary": {
            "total_appointments": total_appointments,
            "completed": completed,
            "scheduled": total_appointments - completed,
            "total_revenue": total_revenue,
            "average_revenue": (
                total_revenue / total_appointments if total_appointments > 0 else 0
            ),
        },
        "calendar": calendar,
    }


# Review Management
@router.post("/reviews/create", status_code=201)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a review for a completed appointment"""

    # Get appointment
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == review_data.appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify appointment is completed
    if appointment.status != "completed":
        raise HTTPException(
            status_code=400, detail="Can only review completed appointments"
        )

    # Check if review already exists
    existing_review = (
        db.query(Review)
        .filter(Review.appointment_id == review_data.appointment_id)
        .first()
    )

    if existing_review:
        raise HTTPException(
            status_code=400, detail="Review already exists for this appointment"
        )

    # Verify user is the client (or admin)
    if current_user.role != "admin":
        # Need to implement client user relationship
        # For now, we'll skip this check
        pass

    # Create review
    review = Review(
        appointment_id=review_data.appointment_id,
        barber_id=appointment.barber_id,
        client_id=appointment.client_id,
        location_id=appointment.barber.location_id,
        overall_rating=ReviewRating(review_data.overall_rating),
        service_rating=(
            ReviewRating(review_data.service_rating)
            if review_data.service_rating
            else None
        ),
        cleanliness_rating=(
            ReviewRating(review_data.cleanliness_rating)
            if review_data.cleanliness_rating
            else None
        ),
        punctuality_rating=(
            ReviewRating(review_data.punctuality_rating)
            if review_data.punctuality_rating
            else None
        ),
        value_rating=(
            ReviewRating(review_data.value_rating) if review_data.value_rating else None
        ),
        title=review_data.title,
        comment=review_data.comment,
        photos=review_data.photos,
        is_verified=True,
        verification_date=datetime.utcnow(),
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    # Update barber's average rating (you might want to do this asynchronously)
    avg_rating = (
        db.query(func.avg(Review.overall_rating))
        .filter(Review.barber_id == appointment.barber_id)
        .scalar()
    )

    # Log action
    log_user_action(
        action="review_created",
        user_id=current_user.id,
        details={
            "review_id": review.id,
            "appointment_id": appointment.id,
            "barber_id": appointment.barber_id,
            "rating": review_data.overall_rating,
        },
    )

    return {
        "message": "Review created successfully",
        "review": {
            "id": review.id,
            "rating": review.overall_rating.value,
            "average_rating": review.average_rating,
            "title": review.title,
        },
    }
