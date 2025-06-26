"""
API endpoints for recurring appointments and series management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, date, time
from pydantic import BaseModel, Field, validator

from config.database import get_db
from models.appointment_series import AppointmentSeries, RecurrencePattern, SeriesStatus
from models.appointment import Appointment
from models.client import Client
from models.booking import Service
from services.recurring_appointment_service import RecurringAppointmentService
from utils.logging import log_user_action

router = APIRouter()


# Pydantic models for requests and responses
class CreateSeriesRequest(BaseModel):
    """Request model for creating a recurring appointment series"""

    client_first_name: str = Field(..., min_length=1, max_length=100)
    client_last_name: str = Field(..., min_length=1, max_length=100)
    client_email: str = Field(..., regex=r"^[^@]+@[^@]+\.[^@]+$")
    client_phone: str = Field(..., min_length=10, max_length=20)
    barber_id: int
    service_id: int
    location_id: int
    recurrence_pattern: RecurrencePattern
    preferred_time: str = Field(
        ..., regex=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
    )  # HH:MM format
    start_date: date
    end_date: Optional[date] = None
    max_appointments: Optional[int] = Field(None, ge=1, le=100)
    series_discount_percent: Optional[float] = Field(0.0, ge=0.0, le=50.0)
    series_name: Optional[str] = Field(None, max_length=100)
    interval_weeks: Optional[int] = Field(1, ge=1, le=12)  # For custom patterns
    is_flexible_time: bool = False
    advance_booking_days: int = Field(60, ge=1, le=365)
    notes: Optional[str] = None

    @validator("end_date")
    def validate_end_date(cls, v, values):
        if v and "start_date" in values and v <= values["start_date"]:
            raise ValueError("End date must be after start date")
        return v

    @validator("preferred_time")
    def validate_time_format(cls, v):
        try:
            time.fromisoformat(v)
        except ValueError:
            raise ValueError("Time must be in HH:MM format")
        return v


class SeriesResponse(BaseModel):
    """Response model for appointment series"""

    id: int
    series_token: str
    series_name: Optional[str]
    recurrence_pattern: RecurrencePattern
    preferred_time: str
    start_date: date
    end_date: Optional[date]
    max_appointments: Optional[int]
    status: SeriesStatus
    series_discount_percent: float
    total_appointments_created: int
    total_appointments_completed: int
    next_appointment_date: Optional[date]
    client_name: str
    barber_name: str
    service_name: str
    service_price: float
    discounted_price: float
    created_at: datetime

    class Config:
        from_attributes = True


class SeriesSavingsResponse(BaseModel):
    """Response model for series savings calculation"""

    appointments_in_period: float
    regular_price_per_appointment: float
    discounted_price_per_appointment: float
    regular_total: float
    discounted_total: float
    total_savings: float
    savings_per_appointment: float


class SeriesExclusionRequest(BaseModel):
    """Request model for adding series exclusions"""

    exclusion_date: date
    reason: str = Field(..., max_length=100)
    reschedule_to_date: Optional[date] = None


# API Endpoints
@router.post("/series/create", response_model=SeriesResponse)
async def create_appointment_series(
    request: CreateSeriesRequest, db: Session = Depends(get_db)
):
    """Create a new recurring appointment series"""

    recurring_service = RecurringAppointmentService(db)

    try:
        # Find or create client
        client = (
            db.query(Client)
            .filter(
                Client.email == request.client_email,
                Client.barber_id == request.barber_id,
            )
            .first()
        )

        if not client:
            client = Client(
                first_name=request.client_first_name,
                last_name=request.client_last_name,
                email=request.client_email,
                phone=request.client_phone,
                barber_id=request.barber_id,
                customer_type="new",
                first_visit_date=request.start_date,
                total_visits=0,
                total_spent=0.0,
            )
            db.add(client)
            db.flush()

        # Parse preferred time
        preferred_time = time.fromisoformat(request.preferred_time)

        # Create the series
        series = recurring_service.create_appointment_series(
            client_id=client.id,
            barber_id=request.barber_id,
            service_id=request.service_id,
            location_id=request.location_id,
            recurrence_pattern=request.recurrence_pattern,
            preferred_time=preferred_time,
            start_date=request.start_date,
            end_date=request.end_date,
            max_appointments=request.max_appointments,
            series_discount_percent=request.series_discount_percent,
            series_name=request.series_name,
            interval_weeks=request.interval_weeks,
            is_flexible_time=request.is_flexible_time,
            advance_booking_days=request.advance_booking_days,
            notes=request.notes,
        )

        # Generate initial appointments
        appointments = recurring_service.generate_upcoming_appointments(
            series.id, lookahead_days=request.advance_booking_days
        )

        # Log the action
        log_user_action(
            action="recurring_series_created",
            user_id=None,  # Public endpoint
            details={
                "series_id": series.id,
                "client_email": client.email,
                "recurrence_pattern": request.recurrence_pattern.value,
                "initial_appointments": len(appointments),
            },
        )

        return _format_series_response(series)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/series/{series_token}", response_model=SeriesResponse)
async def get_series_by_token(series_token: str, db: Session = Depends(get_db)):
    """Get appointment series by token"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    return _format_series_response(series)


@router.get("/series/{series_token}/appointments")
async def get_series_appointments(
    series_token: str,
    include_past: bool = Query(False, description="Include past appointments"),
    db: Session = Depends(get_db),
):
    """Get all appointments for a series"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    query = db.query(Appointment).filter(Appointment.series_id == series.id)

    if not include_past:
        query = query.filter(Appointment.appointment_date >= date.today())

    appointments = query.order_by(Appointment.appointment_date).all()

    return [
        {
            "id": apt.id,
            "appointment_date": apt.appointment_date,
            "appointment_time": apt.appointment_time.time(),
            "status": apt.status,
            "service_name": apt.service_name,
            "service_revenue": apt.service_revenue,
            "duration_minutes": apt.duration_minutes,
            "client_notes": apt.client_notes,
        }
        for apt in appointments
    ]


@router.post("/series/{series_token}/pause")
async def pause_series(
    series_token: str,
    reason: str = Query("Customer requested pause"),
    db: Session = Depends(get_db),
):
    """Pause an appointment series"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    if series.status != SeriesStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Series is not active")

    updated_series = recurring_service.pause_series(series.id, reason)
    return {"message": "Series paused successfully", "status": updated_series.status}


@router.post("/series/{series_token}/resume")
async def resume_series(
    series_token: str,
    reason: str = Query("Customer requested resume"),
    db: Session = Depends(get_db),
):
    """Resume a paused appointment series"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    if series.status != SeriesStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Series is not paused")

    updated_series = recurring_service.resume_series(series.id, reason)
    return {"message": "Series resumed successfully", "status": updated_series.status}


@router.post("/series/{series_token}/cancel")
async def cancel_series(
    series_token: str,
    reason: str = Query("Customer requested cancellation"),
    db: Session = Depends(get_db),
):
    """Cancel an appointment series"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    if series.status not in [SeriesStatus.ACTIVE, SeriesStatus.PAUSED]:
        raise HTTPException(status_code=400, detail="Series cannot be cancelled")

    updated_series = recurring_service.cancel_series(series.id, reason)
    return {"message": "Series cancelled successfully", "status": updated_series.status}


@router.post("/series/{series_token}/exclusions")
async def add_series_exclusion(
    series_token: str, request: SeriesExclusionRequest, db: Session = Depends(get_db)
):
    """Add an exclusion date to a series"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    if series.status != SeriesStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Series is not active")

    exclusion = recurring_service.add_series_exclusion(
        series.id, request.exclusion_date, request.reason, request.reschedule_to_date
    )

    return {
        "message": "Exclusion added successfully",
        "exclusion_date": exclusion.exclusion_date,
        "reason": exclusion.exclusion_reason,
    }


@router.get("/series/calculate-savings", response_model=SeriesSavingsResponse)
async def calculate_series_savings(
    service_id: int,
    recurrence_pattern: RecurrencePattern,
    discount_percent: float = Query(..., ge=0.0, le=50.0),
    duration_months: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
):
    """Calculate potential savings from a recurring series"""

    recurring_service = RecurringAppointmentService(db)

    try:
        savings = recurring_service.calculate_series_savings(
            service_id=service_id,
            recurrence_pattern=recurrence_pattern,
            discount_percent=discount_percent,
            duration_months=duration_months,
        )

        return SeriesSavingsResponse(**savings)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/series/{series_token}/generate-appointments")
async def generate_upcoming_appointments(
    series_token: str,
    lookahead_days: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Generate upcoming appointments for a series"""

    recurring_service = RecurringAppointmentService(db)
    series = recurring_service.get_series_by_token(series_token)

    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    if series.status != SeriesStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Series is not active")

    appointments = recurring_service.generate_upcoming_appointments(
        series.id, lookahead_days
    )

    return {
        "message": f"Generated {len(appointments)} appointments",
        "appointments_created": len(appointments),
        "next_appointment_date": (
            min(apt.appointment_date for apt in appointments) if appointments else None
        ),
    }


def _format_series_response(series: AppointmentSeries) -> SeriesResponse:
    """Format series for response"""

    client_name = f"{series.client.first_name} {series.client.last_name}"
    barber_name = f"{series.barber.first_name} {series.barber.last_name}"

    return SeriesResponse(
        id=series.id,
        series_token=series.series_token,
        series_name=series.series_name,
        recurrence_pattern=series.recurrence_pattern,
        preferred_time=series.preferred_time.strftime("%H:%M"),
        start_date=series.start_date,
        end_date=series.end_date,
        max_appointments=series.max_appointments,
        status=series.status,
        series_discount_percent=series.series_discount_percent,
        total_appointments_created=series.total_appointments_created,
        total_appointments_completed=series.total_appointments_completed,
        next_appointment_date=series.next_appointment_date,
        client_name=client_name,
        barber_name=barber_name,
        service_name=series.service.name,
        service_price=series.service.base_price,
        discounted_price=series.discounted_price_per_appointment,
        created_at=series.created_at,
    )
