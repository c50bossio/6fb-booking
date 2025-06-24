"""
Real-time availability checking API endpoints
Provides instant conflict detection for booking system
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from typing import List, Dict, Optional
from pydantic import BaseModel

from config.database import get_db
from services.availability_service import AvailabilityService
from models.user import User
from api.v1.auth import get_current_user
from utils.logging import get_secure_logger

router = APIRouter()
logger = get_secure_logger(__name__)


# Pydantic models
class AvailabilityCheckRequest(BaseModel):
    barber_id: int
    appointment_date: date
    start_time: time
    duration_minutes: int
    exclude_appointment_id: Optional[int] = None


class ConflictInfo(BaseModel):
    type: str
    message: str
    start_time: str
    end_time: str


class AvailabilityResponse(BaseModel):
    available: bool
    conflicts: List[ConflictInfo]
    checked_at: str


class TimeSlotRequest(BaseModel):
    barber_id: int
    appointment_date: date
    service_duration: int
    buffer_minutes: int = 0


class TimeSlot(BaseModel):
    start_time: str
    end_time: str
    available: bool
    conflicts: List[Dict]


class TimeSlotsResponse(BaseModel):
    date: str
    barber_id: int
    slots: List[TimeSlot]
    generated_at: str


class ReservationRequest(BaseModel):
    barber_id: int
    appointment_date: date
    start_time: time
    duration_minutes: int
    client_name: str
    client_email: str
    client_phone: Optional[str] = None


@router.post("/check", response_model=AvailabilityResponse)
async def check_availability(
    request: AvailabilityCheckRequest, db: Session = Depends(get_db)
):
    """
    Real-time availability check for a specific time slot
    Returns detailed conflict information if slot is unavailable
    """
    logger.info(
        f"Checking availability for barber {request.barber_id} on {request.appointment_date} at {request.start_time}"
    )

    availability_service = AvailabilityService(db)

    is_available, conflicts = availability_service.check_real_time_availability(
        barber_id=request.barber_id,
        appointment_date=request.appointment_date,
        start_time=request.start_time,
        duration_minutes=request.duration_minutes,
        exclude_appointment_id=request.exclude_appointment_id,
    )

    conflict_info = []
    for conflict in conflicts:
        conflict_info.append(
            ConflictInfo(
                type=conflict.type,
                message=conflict.message,
                start_time=conflict.start_time.strftime("%H:%M"),
                end_time=conflict.end_time.strftime("%H:%M"),
            )
        )

    return AvailabilityResponse(
        available=is_available,
        conflicts=conflict_info,
        checked_at=datetime.now().isoformat(),
    )


@router.post("/slots", response_model=TimeSlotsResponse)
async def get_available_slots(request: TimeSlotRequest, db: Session = Depends(get_db)):
    """
    Get all available time slots for a barber on a specific date
    Includes real-time conflict detection for each slot
    """
    logger.info(
        f"Getting available slots for barber {request.barber_id} on {request.appointment_date}"
    )

    availability_service = AvailabilityService(db)

    slots = availability_service.get_available_slots(
        barber_id=request.barber_id,
        appointment_date=request.appointment_date,
        service_duration=request.service_duration,
        buffer_minutes=request.buffer_minutes,
    )

    time_slots = []
    for slot in slots:
        time_slots.append(
            TimeSlot(
                start_time=slot["start_time"],
                end_time=slot["end_time"],
                available=slot["available"],
                conflicts=slot["conflicts"],
            )
        )

    return TimeSlotsResponse(
        date=request.appointment_date.isoformat(),
        barber_id=request.barber_id,
        slots=time_slots,
        generated_at=datetime.now().isoformat(),
    )


@router.post("/reserve")
async def reserve_time_slot(request: ReservationRequest, db: Session = Depends(get_db)):
    """
    Atomically reserve a time slot with conflict detection
    Creates a temporary hold on the time slot
    """
    logger.info(
        f"Reserving slot for barber {request.barber_id} on {request.appointment_date} at {request.start_time}"
    )

    availability_service = AvailabilityService(db)

    try:
        reservation = availability_service.reserve_time_slot(
            barber_id=request.barber_id,
            appointment_date=request.appointment_date,
            start_time=request.start_time,
            duration_minutes=request.duration_minutes,
            client_info={
                "name": request.client_name,
                "email": request.client_email,
                "phone": request.client_phone,
            },
        )

        return {
            "success": True,
            "reservation": reservation,
            "message": "Time slot reserved successfully",
        }

    except HTTPException as e:
        logger.warning(f"Reservation failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during reservation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reserve time slot",
        )


@router.post("/validate-update")
async def validate_appointment_update(
    appointment_id: int,
    new_barber_id: int,
    new_date: date,
    new_time: time,
    new_duration: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validate appointment changes for conflicts
    Used when updating existing appointments
    """
    logger.info(f"Validating update for appointment {appointment_id}")

    availability_service = AvailabilityService(db)

    is_available, conflicts = availability_service.validate_appointment_update(
        appointment_id=appointment_id,
        new_barber_id=new_barber_id,
        new_date=new_date,
        new_time=new_time,
        new_duration=new_duration,
    )

    conflict_info = []
    for conflict in conflicts:
        conflict_info.append(
            {
                "type": conflict.type,
                "message": conflict.message,
                "start_time": conflict.start_time.strftime("%H:%M"),
                "end_time": conflict.end_time.strftime("%H:%M"),
            }
        )

    return {
        "valid": is_available,
        "conflicts": conflict_info,
        "checked_at": datetime.now().isoformat(),
    }


@router.get("/barber/{barber_id}/status")
async def get_barber_availability_status(
    barber_id: int, check_date: Optional[date] = None, db: Session = Depends(get_db)
):
    """
    Get overall availability status for a barber
    Includes business hours, calendar integration status, etc.
    """
    if not check_date:
        check_date = datetime.now().date()

    logger.info(f"Getting availability status for barber {barber_id} on {check_date}")

    availability_service = AvailabilityService(db)

    # Get basic availability info
    day_of_week = check_date.weekday()

    from models.automation import Availability
    from models.google_calendar_settings import GoogleCalendarSettings
    from sqlalchemy import and_

    # Check business hours
    business_hours = (
        db.query(Availability)
        .filter(
            and_(
                Availability.barber_id == barber_id,
                Availability.day_of_week == day_of_week,
                Availability.is_available == True,
            )
        )
        .first()
    )

    # Check Google Calendar integration
    calendar_settings = (
        db.query(GoogleCalendarSettings)
        .filter(GoogleCalendarSettings.barber_id == barber_id)
        .first()
    )

    return {
        "barber_id": barber_id,
        "date": check_date.isoformat(),
        "day_of_week": check_date.strftime("%A"),
        "business_hours": {
            "available": business_hours is not None,
            "start_time": (
                business_hours.start_time.strftime("%H:%M") if business_hours else None
            ),
            "end_time": (
                business_hours.end_time.strftime("%H:%M") if business_hours else None
            ),
            "break_start": (
                business_hours.break_start.strftime("%H:%M")
                if business_hours and business_hours.break_start
                else None
            ),
            "break_end": (
                business_hours.break_end.strftime("%H:%M")
                if business_hours and business_hours.break_end
                else None
            ),
        },
        "google_calendar": {
            "enabled": calendar_settings.is_enabled if calendar_settings else False,
            "calendar_id": calendar_settings.calendar_id if calendar_settings else None,
            "two_way_sync": (
                calendar_settings.two_way_sync if calendar_settings else False
            ),
        },
        "checked_at": datetime.now().isoformat(),
    }
