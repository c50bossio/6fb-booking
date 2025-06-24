"""
Customer Booking API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, func
from datetime import datetime, timedelta
from typing import Optional, List
import logging

from config.database import get_db
from models.customer import Customer
from models.appointment import Appointment
from models.user import User
from models.location import Location
from models.booking import Service
from api.v1.customer_auth import get_current_customer
from pydantic import BaseModel
from utils.logging import log_user_action

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic models
class CustomerAppointmentResponse(BaseModel):
    id: int
    barber_id: int
    barber_name: str
    service_id: int
    service_name: str
    appointment_date: str
    appointment_time: str
    location_id: int
    location_name: str
    location_address: str
    status: str
    total_amount: Optional[float]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class AppointmentListResponse(BaseModel):
    appointments: List[CustomerAppointmentResponse]
    total: int
    page: int
    limit: int


class CustomerStatsResponse(BaseModel):
    totalAppointments: int
    upcomingAppointments: int
    completedAppointments: int
    cancelledAppointments: int
    totalSpent: float
    favoriteBarber: str
    favoriteService: str


class RescheduleRequest(BaseModel):
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None


class CancelRequest(BaseModel):
    reason: Optional[str] = None


class ReviewRequest(BaseModel):
    rating: int
    comment: Optional[str] = None


def format_appointment_response(
    appointment: Appointment,
) -> CustomerAppointmentResponse:
    """Format appointment for customer response"""
    return CustomerAppointmentResponse(
        id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=(
            f"{appointment.barber.first_name} {appointment.barber.last_name}"
            if appointment.barber
            else "Unknown"
        ),
        service_id=appointment.service_id,
        service_name=(
            appointment.service.name if appointment.service else "Unknown Service"
        ),
        appointment_date=appointment.appointment_date.strftime("%Y-%m-%d"),
        appointment_time=appointment.appointment_time.strftime("%H:%M:%S"),
        location_id=appointment.location_id,
        location_name=(
            appointment.location.name if appointment.location else "Unknown Location"
        ),
        location_address=appointment.location.address if appointment.location else "",
        status=appointment.status,
        total_amount=appointment.total_amount,
        notes=appointment.notes,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
    )


@router.get("/appointments", response_model=AppointmentListResponse)
async def get_customer_appointments(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    upcoming_only: Optional[bool] = Query(False),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
):
    """Get customer appointments with filtering"""

    # Build query
    query = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
            joinedload(Appointment.location),
        )
        .filter(Appointment.customer_id == current_customer.id)
    )

    # Apply filters
    if status_filter:
        query = query.filter(Appointment.status == status_filter)

    if upcoming_only:
        current_datetime = datetime.now()
        query = query.filter(
            and_(
                Appointment.appointment_date >= current_datetime.date(),
                Appointment.status.in_(["confirmed", "pending"]),
            )
        )

    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date >= from_date)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD"
            )

    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date <= to_date)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD"
            )

    # Get total count
    total = query.count()

    # Apply pagination and ordering
    appointments = (
        query.order_by(
            desc(Appointment.appointment_date), desc(Appointment.appointment_time)
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Format response
    formatted_appointments = [format_appointment_response(apt) for apt in appointments]

    return AppointmentListResponse(
        appointments=formatted_appointments,
        total=total,
        page=(offset // limit) + 1,
        limit=limit,
    )


@router.get(
    "/appointments/{appointment_id}", response_model=CustomerAppointmentResponse
)
async def get_customer_appointment(
    appointment_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Get specific appointment details"""

    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
            joinedload(Appointment.location),
        )
        .filter(
            and_(
                Appointment.id == appointment_id,
                Appointment.customer_id == current_customer.id,
            )
        )
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return format_appointment_response(appointment)


@router.get("/stats", response_model=CustomerStatsResponse)
async def get_customer_stats(
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Get customer statistics"""

    # Basic counts
    total_appointments = (
        db.query(Appointment)
        .filter(Appointment.customer_id == current_customer.id)
        .count()
    )

    upcoming_appointments = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.customer_id == current_customer.id,
                Appointment.appointment_date >= datetime.now().date(),
                Appointment.status.in_(["confirmed", "pending"]),
            )
        )
        .count()
    )

    completed_appointments = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.customer_id == current_customer.id,
                Appointment.status == "completed",
            )
        )
        .count()
    )

    cancelled_appointments = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.customer_id == current_customer.id,
                Appointment.status == "cancelled",
            )
        )
        .count()
    )

    # Total spent
    total_spent_result = (
        db.query(func.sum(Appointment.total_amount))
        .filter(
            and_(
                Appointment.customer_id == current_customer.id,
                Appointment.status == "completed",
                Appointment.total_amount.isnot(None),
            )
        )
        .scalar()
    )

    total_spent = float(total_spent_result) if total_spent_result else 0.0

    # Favorite barber (most frequent)
    favorite_barber_result = (
        db.query(
            User.first_name,
            User.last_name,
            func.count(Appointment.id).label("appointment_count"),
        )
        .join(Appointment, User.id == Appointment.barber_id)
        .filter(
            and_(
                Appointment.customer_id == current_customer.id,
                Appointment.status == "completed",
            )
        )
        .group_by(User.id, User.first_name, User.last_name)
        .order_by(desc("appointment_count"))
        .first()
    )

    favorite_barber = "None yet"
    if favorite_barber_result:
        favorite_barber = (
            f"{favorite_barber_result.first_name} {favorite_barber_result.last_name}"
        )

    # Favorite service (most frequent)
    favorite_service_result = (
        db.query(Service.name, func.count(Appointment.id).label("appointment_count"))
        .join(Appointment, Service.id == Appointment.service_id)
        .filter(
            and_(
                Appointment.customer_id == current_customer.id,
                Appointment.status == "completed",
            )
        )
        .group_by(Service.id, Service.name)
        .order_by(desc("appointment_count"))
        .first()
    )

    favorite_service = "None yet"
    if favorite_service_result:
        favorite_service = favorite_service_result.name

    return CustomerStatsResponse(
        totalAppointments=total_appointments,
        upcomingAppointments=upcoming_appointments,
        completedAppointments=completed_appointments,
        cancelledAppointments=cancelled_appointments,
        totalSpent=total_spent,
        favoriteBarber=favorite_barber,
        favoriteService=favorite_service,
    )


@router.put(
    "/appointments/{appointment_id}/reschedule",
    response_model=CustomerAppointmentResponse,
)
async def reschedule_appointment(
    appointment_id: int,
    reschedule_data: RescheduleRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Reschedule an appointment"""

    # Get the appointment
    appointment = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.id == appointment_id,
                Appointment.customer_id == current_customer.id,
                Appointment.status == "confirmed",
            )
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404, detail="Appointment not found or cannot be rescheduled"
        )

    # Check if appointment is at least 24 hours away
    appointment_datetime = datetime.combine(
        appointment.appointment_date, appointment.appointment_time
    )
    if appointment_datetime - datetime.now() < timedelta(hours=24):
        raise HTTPException(
            status_code=400,
            detail="Appointments can only be rescheduled at least 24 hours in advance",
        )

    try:
        # Parse new date and time
        new_date = datetime.strptime(
            reschedule_data.appointment_date, "%Y-%m-%d"
        ).date()
        new_time = datetime.strptime(
            reschedule_data.appointment_time, "%H:%M:%S"
        ).time()

        # Check if new datetime is in the future
        new_datetime = datetime.combine(new_date, new_time)
        if new_datetime <= datetime.now():
            raise HTTPException(
                status_code=400, detail="New appointment time must be in the future"
            )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    # TODO: Add availability checking logic here
    # For now, we'll just update the appointment

    # Update appointment
    appointment.appointment_date = new_date
    appointment.appointment_time = new_time
    appointment.updated_at = datetime.utcnow()

    # Add reschedule note
    reschedule_note = (
        f"Rescheduled by customer on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    if reschedule_data.reason:
        reschedule_note += f". Reason: {reschedule_data.reason}"

    if appointment.notes:
        appointment.notes += f"\n{reschedule_note}"
    else:
        appointment.notes = reschedule_note

    db.commit()
    db.refresh(appointment)

    # Log the action
    log_user_action(
        action="customer_appointment_rescheduled",
        user_id=current_customer.id,
        details={
            "appointment_id": appointment_id,
            "new_date": reschedule_data.appointment_date,
            "new_time": reschedule_data.appointment_time,
            "reason": reschedule_data.reason,
        },
    )

    # Reload with relationships
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber),
            joinedload(Appointment.service),
            joinedload(Appointment.location),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )

    return format_appointment_response(appointment)


@router.put("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    cancel_data: CancelRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Cancel an appointment"""

    # Get the appointment
    appointment = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.id == appointment_id,
                Appointment.customer_id == current_customer.id,
                Appointment.status == "confirmed",
            )
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404, detail="Appointment not found or cannot be cancelled"
        )

    # Check if appointment is at least 2 hours away
    appointment_datetime = datetime.combine(
        appointment.appointment_date, appointment.appointment_time
    )
    if appointment_datetime - datetime.now() < timedelta(hours=2):
        raise HTTPException(
            status_code=400,
            detail="Appointments can only be cancelled at least 2 hours in advance",
        )

    # Update appointment status
    appointment.status = "cancelled"
    appointment.updated_at = datetime.utcnow()

    # Add cancellation note
    cancel_note = (
        f"Cancelled by customer on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    if cancel_data.reason:
        cancel_note += f". Reason: {cancel_data.reason}"

    if appointment.notes:
        appointment.notes += f"\n{cancel_note}"
    else:
        appointment.notes = cancel_note

    db.commit()

    # Log the action
    log_user_action(
        action="customer_appointment_cancelled",
        user_id=current_customer.id,
        details={"appointment_id": appointment_id, "reason": cancel_data.reason},
    )

    return {"message": "Appointment cancelled successfully"}


@router.get("/appointments/{appointment_id}/available-slots")
async def get_available_slots_for_reschedule(
    appointment_id: int,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Get available time slots for rescheduling an appointment"""

    # Get the appointment
    appointment = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.id == appointment_id,
                Appointment.customer_id == current_customer.id,
            )
        )
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )

    # Check if date is in the future
    if target_date <= datetime.now().date():
        raise HTTPException(status_code=400, detail="Date must be in the future")

    # TODO: Implement actual availability checking logic
    # For now, return some sample time slots
    sample_slots = [
        "09:00:00",
        "09:30:00",
        "10:00:00",
        "10:30:00",
        "11:00:00",
        "11:30:00",
        "12:00:00",
        "12:30:00",
        "14:00:00",
        "14:30:00",
        "15:00:00",
        "15:30:00",
        "16:00:00",
        "16:30:00",
        "17:00:00",
        "17:30:00",
    ]

    return {"slots": sample_slots}


@router.post("/appointments/{appointment_id}/review")
async def add_appointment_review(
    appointment_id: int,
    review_data: ReviewRequest,
    current_customer: Customer = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    """Add a review for a completed appointment"""

    # Get the appointment
    appointment = (
        db.query(Appointment)
        .filter(
            and_(
                Appointment.id == appointment_id,
                Appointment.customer_id == current_customer.id,
                Appointment.status == "completed",
            )
        )
        .first()
    )

    if not appointment:
        raise HTTPException(status_code=404, detail="Completed appointment not found")

    # Validate rating
    if not 1 <= review_data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # TODO: Implement review storage logic
    # For now, just add it to the appointment notes

    review_note = f"Customer review ({review_data.rating}/5 stars) added on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    if review_data.comment:
        review_note += f": {review_data.comment}"

    if appointment.notes:
        appointment.notes += f"\n{review_note}"
    else:
        appointment.notes = review_note

    appointment.updated_at = datetime.utcnow()
    db.commit()

    # Log the action
    log_user_action(
        action="customer_appointment_reviewed",
        user_id=current_customer.id,
        details={
            "appointment_id": appointment_id,
            "rating": review_data.rating,
            "comment": review_data.comment,
        },
    )

    return {"message": "Review added successfully"}
