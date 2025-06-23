"""
Appointment management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time, timedelta, timezone
import pytz
from zoneinfo import ZoneInfo

from config.database import get_db
from models.user import User
from models.appointment import Appointment
from models.barber import Barber
from models.client import Client
from models.booking import (
    Service,
    ServiceCategory,
    BarberAvailability,
    BookingRule,
    DayOfWeek,
    BookingSlot,
)
from models.location import Location
from services.rbac_service import RBACService, Permission
from services.notification_service import NotificationService
from .auth import get_current_user
from pydantic import BaseModel, Field, validator
from enum import Enum
import json
import httpx
import logging
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


# Enums
class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class RecurrenceFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


# Pydantic models
class AppointmentCreate(BaseModel):
    barber_id: int
    client_id: Optional[int] = None
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    appointment_date: date
    appointment_time: time
    service_id: Optional[int] = None
    service_name: str
    service_duration: int = 30
    service_price: float
    notes: Optional[str] = None
    timezone: str = Field(default="America/New_York")
    send_confirmation: bool = True
    deposit_paid: Optional[float] = None

    @validator("timezone")
    def validate_timezone(cls, v):
        try:
            ZoneInfo(v)
            return v
        except:
            raise ValueError(f"Invalid timezone: {v}")


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status: Optional[AppointmentStatus] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    service_duration: Optional[int] = None
    service_price: Optional[float] = None
    service_revenue: Optional[float] = None
    tip_amount: Optional[float] = None
    product_revenue: Optional[float] = None
    notes: Optional[str] = None
    barber_id: Optional[int] = None  # For reassigning
    timezone: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    barber_id: int
    barber_name: str
    client_id: Optional[int]
    client_name: str
    client_email: Optional[str]
    client_phone: Optional[str]
    appointment_date: date
    appointment_time: Optional[time]
    status: str
    service_name: str
    service_duration: int
    service_price: float
    service_revenue: Optional[float]
    tip_amount: Optional[float]
    product_revenue: Optional[float]
    total_amount: float
    customer_type: str
    source: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TimeSlot(BaseModel):
    time: str
    available: bool
    barber_id: int
    barber_name: str
    services_available: List[int] = []
    reason: Optional[str] = None  # If not available


class AvailableSlotsResponse(BaseModel):
    date: date
    timezone: str
    slots: List[TimeSlot]
    total_slots: int
    available_slots: int


class BlockTimeRequest(BaseModel):
    barber_id: int
    start_datetime: datetime
    end_datetime: datetime
    reason: str = "Break"
    recurring: bool = False
    recurrence_end_date: Optional[date] = None

    @validator("end_datetime")
    def validate_end_after_start(cls, v, values):
        if "start_datetime" in values and v <= values["start_datetime"]:
            raise ValueError("End time must be after start time")
        return v


class RecurringAppointmentRequest(BaseModel):
    appointment_data: AppointmentCreate
    frequency: RecurrenceFrequency
    occurrences: int = Field(ge=1, le=52)  # Max 1 year of weekly appointments
    skip_holidays: bool = True


class AppointmentDetailResponse(AppointmentResponse):
    client_history: Optional[Dict[str, Any]] = None
    previous_appointments: Optional[int] = None
    total_spent: Optional[float] = None
    no_show_count: Optional[int] = None
    average_tip_percentage: Optional[float] = None
    preferred_services: Optional[List[str]] = None
    last_visit: Optional[date] = None


class CalendarAppointmentResponse(BaseModel):
    """Optimized response for calendar view"""

    id: int
    title: str  # Client name + service
    start: datetime
    end: datetime
    barber_id: int
    barber_name: str
    barber_color: Optional[str] = None  # For calendar display
    client_name: str
    service_name: str
    status: str
    status_color: Optional[str] = None
    editable: bool = True
    deletable: bool = True

    class Config:
        from_attributes = True


class BarberScheduleResponse(BaseModel):
    barber_id: int
    barber_name: str
    location_id: int
    location_name: str
    regular_hours: List[Dict[str, Any]]
    blocked_times: List[Dict[str, Any]]
    special_availability: List[Dict[str, Any]]
    timezone: str


class BarberAvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_start: Optional[time] = None
    break_end: Optional[time] = None
    is_available: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_until: Optional[date] = None


# Helper functions
async def send_webhook_notification(event_type: str, data: Dict[str, Any]):
    """Send webhook notification for appointment events"""
    try:
        # Get webhook URL from settings (you'll need to add this to settings)
        webhook_url = getattr(settings, "APPOINTMENT_WEBHOOK_URL", None)
        if not webhook_url:
            return

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json={
                    "event": event_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    "data": data,
                },
                timeout=10.0,
            )

            if response.status_code != 200:
                logger.warning(
                    f"Webhook notification failed: {response.status_code} - {response.text}"
                )
    except Exception as e:
        logger.error(f"Error sending webhook notification: {str(e)}")


# API Endpoints
@router.get("/", response_model=List[AppointmentResponse])
async def get_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    barber_id: Optional[int] = None,
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of appointments with filters"""
    rbac = RBACService(db)

    query = db.query(Appointment)

    # Apply filters
    if barber_id:
        query = query.filter(Appointment.barber_id == barber_id)
    if status:
        query = query.filter(Appointment.status == status)
    if start_date:
        query = query.filter(Appointment.appointment_date >= start_date)
    if end_date:
        query = query.filter(Appointment.appointment_date <= end_date)

    # Apply permission-based filtering
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            # Filter by accessible locations
            accessible_locations = rbac.get_accessible_locations(current_user)
            barber_ids = (
                db.query(Barber.id)
                .filter(Barber.location_id.in_(accessible_locations))
                .subquery()
            )
            query = query.filter(Appointment.barber_id.in_(barber_ids))
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            # Only own appointments
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                query = query.filter(Appointment.barber_id == barber.id)
            else:
                return []
        else:
            return []

    # Apply location filter if specified
    if location_id:
        barber_ids = (
            db.query(Barber.id).filter(Barber.location_id == location_id).subquery()
        )
        query = query.filter(Appointment.barber_id.in_(barber_ids))

    # PERFORMANCE OPTIMIZATION: Use eager loading to eliminate N+1 queries
    appointments = (
        query.options(
            joinedload(Appointment.barber).joinedload(Barber.user),
            joinedload(Appointment.client),
            joinedload(Appointment.barber).joinedload(Barber.location),
        )
        .order_by(Appointment.appointment_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Build response - now using preloaded relationships
    result = []
    for appointment in appointments:
        # Access preloaded barber relationship instead of separate query
        barber = appointment.barber

        total_amount = (
            (appointment.service_revenue or 0)
            + (appointment.tip_amount or 0)
            + (appointment.product_revenue or 0)
        )

        result.append(
            AppointmentResponse(
                id=appointment.id,
                barber_id=appointment.barber_id,
                barber_name=(
                    f"{barber.first_name} {barber.last_name}" if barber else "Unknown"
                ),
                client_id=appointment.client_id,
                client_name=(
                    appointment.client.full_name if appointment.client else "Unknown"
                ),
                client_email=appointment.client.email if appointment.client else None,
                client_phone=appointment.client.phone if appointment.client else None,
                appointment_date=appointment.appointment_date,
                appointment_time=(
                    appointment.appointment_time.time()
                    if appointment.appointment_time
                    else None
                ),
                status=appointment.status,
                service_name=appointment.service_name,
                service_duration=appointment.duration_minutes,
                service_price=appointment.service_revenue,
                service_revenue=appointment.service_revenue,
                tip_amount=appointment.tip_amount,
                product_revenue=appointment.product_revenue,
                total_amount=total_amount,
                customer_type=appointment.customer_type,
                source=appointment.booking_source,
                notes=appointment.barber_notes,
                created_at=appointment.created_at,
            )
        )

    return result


@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create new appointment"""
    rbac = RBACService(db)

    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == appointment_data.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to create appointments for this barber",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only create own appointments",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to create appointments",
            )

    # Check if client exists or create new
    if appointment_data.client_id:
        client = (
            db.query(Client).filter(Client.id == appointment_data.client_id).first()
        )
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
            )
        customer_type = "returning"
    else:
        # Check if client exists by email/phone
        if appointment_data.client_email:
            client = (
                db.query(Client)
                .filter(Client.email == appointment_data.client_email)
                .first()
            )
        elif appointment_data.client_phone:
            client = (
                db.query(Client)
                .filter(Client.phone == appointment_data.client_phone)
                .first()
            )
        else:
            client = None

        if client:
            appointment_data.client_id = client.id
            customer_type = "returning"
        else:
            # Create new client
            client = Client(
                first_name=(
                    appointment_data.client_name.split()[0]
                    if appointment_data.client_name
                    else "Guest"
                ),
                last_name=(
                    " ".join(appointment_data.client_name.split()[1:])
                    if appointment_data.client_name
                    and len(appointment_data.client_name.split()) > 1
                    else ""
                ),
                email=appointment_data.client_email,
                phone=appointment_data.client_phone,
                barber_id=appointment_data.barber_id,
            )
            db.add(client)
            db.commit()
            db.refresh(client)
            appointment_data.client_id = client.id
            customer_type = "new"

    # Create appointment
    new_appointment = Appointment(
        barber_id=appointment_data.barber_id,
        client_id=client.id,
        client_name=appointment_data.client_name,
        client_email=appointment_data.client_email,
        client_phone=appointment_data.client_phone,
        appointment_date=appointment_data.appointment_date,
        appointment_time=appointment_data.appointment_time,
        status="scheduled",
        service_id=appointment_data.service_id,
        service_name=appointment_data.service_name,
        service_duration=appointment_data.service_duration,
        service_price=appointment_data.service_price,
        customer_type=customer_type,
        source="platform",
        notes=appointment_data.notes,
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    # Send webhook notification
    await send_webhook_notification(
        "appointment.created",
        {
            "appointment_id": new_appointment.id,
            "barber_id": new_appointment.barber_id,
            "client_id": new_appointment.client_id,
            "date": new_appointment.appointment_date.isoformat(),
            "time": (
                new_appointment.appointment_time.isoformat()
                if new_appointment.appointment_time
                else None
            ),
            "service": new_appointment.service_name,
            "status": new_appointment.status,
        },
    )

    # Send confirmation email if requested
    if appointment_data.send_confirmation:
        notification_service = NotificationService()
        await notification_service.send_appointment_notification(
            db,
            new_appointment.barber_id,
            "appointment_confirmation",
            {"appointment_id": new_appointment.id, "client_email": client.email},
        )

    return AppointmentResponse(
        id=new_appointment.id,
        barber_id=new_appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        client_id=new_appointment.client_id,
        client_name=client.full_name,
        client_email=client.email,
        client_phone=client.phone,
        appointment_date=new_appointment.appointment_date,
        appointment_time=(
            new_appointment.appointment_time.time()
            if new_appointment.appointment_time
            else None
        ),
        status=new_appointment.status,
        service_name=new_appointment.service_name,
        service_duration=new_appointment.duration_minutes,
        service_price=new_appointment.service_revenue,
        service_revenue=new_appointment.service_revenue,
        tip_amount=new_appointment.tip_amount,
        product_revenue=new_appointment.product_revenue,
        total_amount=new_appointment.service_revenue,
        customer_type=new_appointment.customer_type,
        source=new_appointment.booking_source,
        notes=new_appointment.barber_notes,
        created_at=new_appointment.created_at,
    )


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific appointment"""
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber).joinedload(Barber.user),
            joinedload(Appointment.client),
            joinedload(Appointment.barber).joinedload(Barber.location),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Check permissions
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()

    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this appointment",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only view own appointments",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view appointments",
            )

    total_amount = (
        (appointment.service_revenue or 0)
        + (appointment.tip_amount or 0)
        + (appointment.product_revenue or 0)
    )

    return AppointmentResponse(
        id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}" if barber else "Unknown",
        client_id=appointment.client_id,
        client_name=appointment.client.full_name if appointment.client else "Unknown",
        client_email=appointment.client.email if appointment.client else None,
        client_phone=appointment.client.phone if appointment.client else None,
        appointment_date=appointment.appointment_date,
        appointment_time=(
            appointment.appointment_time.time()
            if appointment.appointment_time
            else None
        ),
        status=appointment.status,
        service_name=appointment.service_name,
        service_duration=appointment.duration_minutes,
        service_price=appointment.service_revenue,
        service_revenue=appointment.service_revenue,
        tip_amount=appointment.tip_amount,
        product_revenue=appointment.product_revenue,
        total_amount=total_amount,
        customer_type=appointment.customer_type,
        source=appointment.booking_source,
        notes=appointment.barber_notes,
        created_at=appointment.created_at,
    )


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update appointment"""
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber).joinedload(Barber.user),
            joinedload(Appointment.client),
            joinedload(Appointment.barber).joinedload(Barber.location),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Check permissions
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()

    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to update this appointment",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only update own appointments",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to update appointments",
            )

    # Update fields
    update_data = appointment_update.dict(exclude_unset=True)

    # If completing appointment, ensure revenue is set
    if update_data.get("status") == "completed" and not appointment.service_revenue:
        # Set default service revenue if not already set
        if "service_revenue" not in update_data:
            update_data["service_revenue"] = update_data.get("service_price", 0)

    for field, value in update_data.items():
        setattr(appointment, field, value)

    appointment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(appointment)

    # Send webhook notification
    await send_webhook_notification(
        "appointment.updated",
        {
            "appointment_id": appointment.id,
            "barber_id": appointment.barber_id,
            "client_id": appointment.client_id,
            "date": appointment.appointment_date.isoformat(),
            "time": (
                appointment.appointment_time.isoformat()
                if appointment.appointment_time
                else None
            ),
            "status": appointment.status,
            "changes": list(update_data.keys()),
        },
    )

    total_amount = (
        (appointment.service_revenue or 0)
        + (appointment.tip_amount or 0)
        + (appointment.product_revenue or 0)
    )

    return AppointmentResponse(
        id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}" if barber else "Unknown",
        client_id=appointment.client_id,
        client_name=appointment.client.full_name if appointment.client else "Unknown",
        client_email=appointment.client.email if appointment.client else None,
        client_phone=appointment.client.phone if appointment.client else None,
        appointment_date=appointment.appointment_date,
        appointment_time=(
            appointment.appointment_time.time()
            if appointment.appointment_time
            else None
        ),
        status=appointment.status,
        service_name=appointment.service_name,
        service_duration=appointment.duration_minutes,
        service_price=appointment.service_revenue,
        service_revenue=appointment.service_revenue,
        tip_amount=appointment.tip_amount,
        product_revenue=appointment.product_revenue,
        total_amount=total_amount,
        customer_type=appointment.customer_type,
        source=appointment.booking_source,
        notes=appointment.barber_notes,
        created_at=appointment.created_at,
    )


@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel appointment"""
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber).joinedload(Barber.user),
            joinedload(Appointment.client),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Check permissions (same as update)
    rbac = RBACService(db)
    barber = db.query(Barber).filter(Barber.id == appointment.barber_id).first()

    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to cancel this appointment",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only cancel own appointments",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to cancel appointments",
            )

    # Cancel appointment
    appointment.status = "cancelled"
    appointment.updated_at = datetime.utcnow()
    db.commit()

    # Send webhook notification
    await send_webhook_notification(
        "appointment.cancelled",
        {
            "appointment_id": appointment.id,
            "barber_id": appointment.barber_id,
            "client_id": appointment.client_id,
            "date": appointment.appointment_date.isoformat(),
            "time": (
                appointment.appointment_time.isoformat()
                if appointment.appointment_time
                else None
            ),
            "cancelled_at": datetime.utcnow().isoformat(),
        },
    )

    # Send cancellation notification to client
    if appointment.client and appointment.client.email:
        notification_service = NotificationService()
        await notification_service.send_appointment_notification(
            db,
            appointment.barber_id,
            "appointment_cancellation",
            {
                "appointment_id": appointment.id,
                "client_email": appointment.client.email,
            },
        )

    return {"message": "Appointment cancelled successfully"}


@router.get("/availability/{barber_id}")
async def get_barber_availability(
    barber_id: int,
    date: date = Query(default=date.today()),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available time slots for a barber on a specific date"""
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Get existing appointments
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date == date,
            Appointment.status.in_(["scheduled", "confirmed"]),
        )
        .all()
    )

    # Generate time slots (9 AM to 8 PM, 30-minute intervals)
    slots = []
    start_time = datetime.combine(date, time(9, 0))
    end_time = datetime.combine(date, time(20, 0))
    slot_duration = timedelta(minutes=30)

    current_slot = start_time
    while current_slot < end_time:
        slot_time = current_slot.time()

        # Check if slot is available
        is_available = True
        for appointment in appointments:
            if appointment.appointment_time == slot_time:
                is_available = False
                break

        slots.append({"time": slot_time.strftime("%H:%M"), "available": is_available})

        current_slot += slot_duration

    return {
        "barber_id": barber_id,
        "date": date.isoformat(),
        "slots": slots,
        "total_slots": len(slots),
        "available_slots": len([s for s in slots if s["available"]]),
    }


# New comprehensive endpoints


@router.get("/calendar-view", response_model=List[CalendarAppointmentResponse])
async def get_calendar_appointments(
    start_date: date = Query(..., description="Start date for calendar view"),
    end_date: date = Query(..., description="End date for calendar view"),
    barber_id: Optional[int] = None,
    location_id: Optional[int] = None,
    status: Optional[List[AppointmentStatus]] = Query(None),
    timezone: str = Query("America/New_York", description="Timezone for the calendar"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get appointments formatted for calendar view with timezone support"""
    rbac = RBACService(db)

    # Validate timezone
    try:
        tz = ZoneInfo(timezone)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {timezone}",
        )

    query = db.query(Appointment).options(
        joinedload(Appointment.barber).joinedload(Barber.user),
        joinedload(Appointment.barber).joinedload(Barber.location),
        joinedload(Appointment.client),
    )

    # Date range filter
    query = query.filter(
        Appointment.appointment_date >= start_date,
        Appointment.appointment_date <= end_date,
    )

    # Apply filters
    if barber_id:
        query = query.filter(Appointment.barber_id == barber_id)
    if status:
        query = query.filter(Appointment.status.in_([s.value for s in status]))

    # Apply permission-based filtering
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if location_id and location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No access to this location",
                )
            barber_ids = (
                db.query(Barber.id)
                .filter(Barber.location_id.in_(accessible_locations))
                .subquery()
            )
            query = query.filter(Appointment.barber_id.in_(barber_ids))
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                query = query.filter(Appointment.barber_id == barber.id)
            else:
                return []
        else:
            return []

    # Apply location filter if specified
    if location_id:
        barber_ids = (
            db.query(Barber.id).filter(Barber.location_id == location_id).subquery()
        )
        query = query.filter(Appointment.barber_id.in_(barber_ids))

    appointments = query.all()

    # Format for calendar
    calendar_appointments = []
    status_colors = {
        "scheduled": "#3B82F6",  # Blue
        "confirmed": "#10B981",  # Green
        "in_progress": "#F59E0B",  # Amber
        "completed": "#6B7280",  # Gray
        "cancelled": "#EF4444",  # Red
        "no_show": "#991B1B",  # Dark Red
    }

    for apt in appointments:
        # Combine date and time
        if apt.appointment_time:
            start_dt = datetime.combine(apt.appointment_date, apt.appointment_time)
        else:
            # Default to 9 AM if no time specified
            start_dt = datetime.combine(apt.appointment_date, time(9, 0))

        # Calculate end time based on duration
        duration = apt.service_duration or 60
        end_dt = start_dt + timedelta(minutes=duration)

        # Convert to timezone-aware datetime
        start_dt = start_dt.replace(tzinfo=tz)
        end_dt = end_dt.replace(tzinfo=tz)

        # Determine if user can edit/delete
        can_modify = rbac.has_permission(
            current_user, Permission.MANAGE_ALL_APPOINTMENTS
        ) or (
            rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS)
            and apt.barber.user_id == current_user.id
        )

        calendar_appointments.append(
            CalendarAppointmentResponse(
                id=apt.id,
                title=f"{apt.client_name} - {apt.service_name}",
                start=start_dt,
                end=end_dt,
                barber_id=apt.barber_id,
                barber_name=f"{apt.barber.first_name} {apt.barber.last_name}",
                barber_color=f"#{apt.barber_id:06x}",  # Generate color from ID
                client_name=apt.client_name,
                service_name=apt.service_name,
                status=apt.status,
                status_color=status_colors.get(apt.status, "#6B7280"),
                editable=can_modify and apt.status not in ["completed", "cancelled"],
                deletable=can_modify and apt.status == "scheduled",
            )
        )

    return calendar_appointments


@router.get("/multi-barber-availability")
async def get_multi_barber_availability(
    date: date = Query(..., description="Date to check availability"),
    barber_ids: str = Query(..., description="Comma-separated barber IDs"),
    service_id: Optional[int] = Query(
        None, description="Service ID for duration check"
    ),
    timezone: str = Query("America/New_York", description="Timezone for slots"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get availability for multiple barbers on a specific date"""
    try:
        barber_id_list = [
            int(bid.strip()) for bid in barber_ids.split(",") if bid.strip()
        ]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid barber IDs format"
        )

    if not barber_id_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one barber ID is required",
        )

    availability_results = {}

    for barber_id in barber_id_list:
        try:
            # Get individual barber availability
            slots_response = await get_available_slots(
                barber_id=barber_id,
                date=date,
                service_id=service_id,
                timezone=timezone,
                current_user=current_user,
                db=db,
            )
            availability_results[str(barber_id)] = slots_response
        except HTTPException:
            # Skip barbers that don't exist or have no availability
            continue
        except Exception as e:
            logger.warning(f"Error getting availability for barber {barber_id}: {e}")
            continue

    return {
        "date": date.isoformat(),
        "timezone": timezone,
        "barber_availability": availability_results,
        "total_barbers": len(availability_results),
    }


@router.get("/available-slots", response_model=AvailableSlotsResponse)
async def get_available_slots(
    barber_id: int = Query(..., description="Barber ID"),
    date: date = Query(..., description="Date to check availability"),
    service_id: Optional[int] = Query(
        None, description="Service ID for duration check"
    ),
    timezone: str = Query("America/New_York", description="Timezone for slots"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available time slots for a specific barber and date"""
    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Get service duration if specified
    service_duration = 60  # Default
    if service_id:
        service = db.query(Service).filter(Service.id == service_id).first()
        if service:
            service_duration = service.duration_minutes + (service.buffer_minutes or 0)

    # Get barber's schedule for the day with optimized query
    day_of_week = date.weekday()  # 0 = Monday
    availability = (
        db.query(BarberAvailability)
        .options(joinedload(BarberAvailability.barber))
        .filter(
            BarberAvailability.barber_id == barber_id,
            BarberAvailability.day_of_week == DayOfWeek(day_of_week),
            BarberAvailability.is_available == True,
        )
        .filter(
            or_(
                BarberAvailability.effective_from == None,
                BarberAvailability.effective_from <= date,
            )
        )
        .filter(
            or_(
                BarberAvailability.effective_until == None,
                BarberAvailability.effective_until >= date,
            )
        )
        .first()
    )

    if not availability:
        # No schedule for this day - return empty slots
        return AvailableSlotsResponse(
            date=date, timezone=timezone, slots=[], total_slots=0, available_slots=0
        )

    # Get existing appointments for the day with select fields for performance
    existing_appointments = (
        db.query(Appointment.appointment_time, Appointment.service_duration)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date == date,
            Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
        )
        .all()
    )

    # Get blocked times for the day
    blocked_slots = (
        db.query(BookingSlot)
        .filter(
            BookingSlot.barber_id == barber_id,
            BookingSlot.slot_date == date,
            BookingSlot.is_blocked == True,
        )
        .all()
    )

    # Generate time slots
    slots = []
    slot_duration = timedelta(minutes=15)  # 15-minute slots

    # Convert schedule times to datetime
    start_dt = datetime.combine(date, availability.start_time)
    end_dt = datetime.combine(date, availability.end_time)

    # Handle break times
    break_start = None
    break_end = None
    if availability.break_start and availability.break_end:
        break_start = datetime.combine(date, availability.break_start)
        break_end = datetime.combine(date, availability.break_end)

    current_slot = start_dt
    while current_slot + timedelta(minutes=service_duration) <= end_dt:
        slot_time = current_slot.time()
        slot_end = current_slot + timedelta(minutes=service_duration)

        # Check if slot is during break time
        if break_start and break_end:
            if current_slot < break_end and slot_end > break_start:
                slots.append(
                    TimeSlot(
                        time=slot_time.strftime("%H:%M"),
                        available=False,
                        barber_id=barber_id,
                        barber_name=f"{barber.first_name} {barber.last_name}",
                        reason="Break time",
                    )
                )
                current_slot += slot_duration
                continue

        # Check if slot conflicts with existing appointments
        is_available = True
        reason = None

        for apt in existing_appointments:
            if apt.appointment_time:
                apt_start = datetime.combine(date, apt.appointment_time)
                apt_end = apt_start + timedelta(minutes=apt.service_duration or 60)

                if current_slot < apt_end and slot_end > apt_start:
                    is_available = False
                    reason = "Already booked"
                    break

        # Check blocked slots
        if is_available:
            for blocked in blocked_slots:
                blocked_start = datetime.combine(date, blocked.start_time)
                blocked_end = datetime.combine(date, blocked.end_time)

                if current_slot < blocked_end and slot_end > blocked_start:
                    is_available = False
                    reason = blocked.block_reason or "Time blocked"
                    break

        # Check booking rules (e.g., minimum advance booking)
        if is_available:
            now = datetime.now()
            if service_id:
                # Check service-specific rules
                rules = (
                    db.query(BookingRule)
                    .filter(
                        BookingRule.is_active == True,
                        or_(
                            BookingRule.service_id == service_id,
                            BookingRule.barber_id == barber_id,
                            BookingRule.location_id == barber.location_id,
                        ),
                    )
                    .all()
                )

                for rule in rules:
                    if rule.rule_type == "booking_window" and rule.parameters:
                        params = rule.parameters
                        min_hours = params.get("min_hours", 0)
                        if current_slot < now + timedelta(hours=min_hours):
                            is_available = False
                            reason = f"Must book at least {min_hours} hours in advance"
                            break

        slots.append(
            TimeSlot(
                time=slot_time.strftime("%H:%M"),
                available=is_available,
                barber_id=barber_id,
                barber_name=f"{barber.first_name} {barber.last_name}",
                services_available=[service_id] if service_id and is_available else [],
                reason=reason,
            )
        )

        current_slot += slot_duration

    available_count = len([s for s in slots if s.available])

    return AvailableSlotsResponse(
        date=date,
        timezone=timezone,
        slots=slots,
        total_slots=len(slots),
        available_slots=available_count,
    )


@router.post("/block-time", status_code=status.HTTP_201_CREATED)
async def block_time_slots(
    block_request: BlockTimeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Block time slots for breaks, lunch, etc."""
    rbac = RBACService(db)

    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == block_request.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only block own time slots",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to block time slots",
            )

    # Create blocked slots
    blocked_slots = []

    if block_request.recurring and block_request.recurrence_end_date:
        # Handle recurring blocks
        current_date = block_request.start_datetime.date()
        end_date = block_request.recurrence_end_date

        while current_date <= end_date:
            # Check if this day of week matches
            if current_date.weekday() == block_request.start_datetime.weekday():
                slot = BookingSlot(
                    barber_id=block_request.barber_id,
                    location_id=barber.location_id,
                    service_id=None,  # Blocked for all services
                    slot_date=current_date,
                    start_time=block_request.start_datetime.time(),
                    end_time=block_request.end_datetime.time(),
                    is_available=False,
                    is_blocked=True,
                    block_reason=block_request.reason,
                )
                db.add(slot)
                blocked_slots.append(slot)

            current_date += timedelta(days=1)
    else:
        # Single block
        slot = BookingSlot(
            barber_id=block_request.barber_id,
            location_id=barber.location_id,
            service_id=None,
            slot_date=block_request.start_datetime.date(),
            start_time=block_request.start_datetime.time(),
            end_time=block_request.end_datetime.time(),
            is_available=False,
            is_blocked=True,
            block_reason=block_request.reason,
        )
        db.add(slot)
        blocked_slots.append(slot)

    db.commit()

    # Send webhook notification about schedule change
    await send_webhook_notification(
        "schedule.blocked",
        {
            "barber_id": block_request.barber_id,
            "blocked_slots": len(blocked_slots),
            "reason": block_request.reason,
            "recurring": block_request.recurring,
            "start": block_request.start_datetime.isoformat(),
            "end": block_request.end_datetime.isoformat(),
        },
    )

    return {
        "message": f"Successfully blocked {len(blocked_slots)} time slots",
        "slots_blocked": len(blocked_slots),
        "reason": block_request.reason,
    }


@router.get("/{appointment_id}/details", response_model=AppointmentDetailResponse)
async def get_appointment_details(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full appointment details including client history"""
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber).joinedload(Barber.user),
            joinedload(Appointment.client),
            joinedload(Appointment.barber).joinedload(Barber.location),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Check permissions
    rbac = RBACService(db)
    barber = appointment.barber

    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber and barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this appointment",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if not barber or barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only view own appointments",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to view appointments",
            )

    # Get client history if client exists
    client_history = None
    if appointment.client_id:
        # Get all appointments for this client with optimized query
        client_appointments = (
            db.query(Appointment)
            .options(joinedload(Appointment.barber).joinedload(Barber.user))
            .filter(
                Appointment.client_id == appointment.client_id,
                Appointment.status.in_(["completed", "no_show"]),
            )
            .all()
        )

        if client_appointments:
            total_spent = sum(apt.total_revenue for apt in client_appointments)
            no_shows = len(
                [apt for apt in client_appointments if apt.status == "no_show"]
            )
            completed = [
                apt for apt in client_appointments if apt.status == "completed"
            ]

            # Calculate average tip
            tips = [apt.tip_percentage for apt in completed if apt.tip_amount]
            avg_tip = sum(tips) / len(tips) if tips else 0

            # Get preferred services
            service_counts = {}
            for apt in completed:
                if apt.service_name:
                    service_counts[apt.service_name] = (
                        service_counts.get(apt.service_name, 0) + 1
                    )

            preferred_services = sorted(
                service_counts.items(), key=lambda x: x[1], reverse=True
            )[:3]

            # Last visit
            last_completed = max(
                [apt.appointment_date for apt in completed], default=None
            )

            client_history = {
                "total_appointments": len(client_appointments),
                "completed_appointments": len(completed),
                "no_shows": no_shows,
                "total_spent": total_spent,
                "average_ticket": total_spent / len(completed) if completed else 0,
                "average_tip_percentage": avg_tip,
                "preferred_services": [s[0] for s in preferred_services],
                "last_visit": last_completed,
            }

    # Build detailed response
    total_amount = (
        (appointment.service_revenue or 0)
        + (appointment.tip_amount or 0)
        + (appointment.product_revenue or 0)
    )

    return AppointmentDetailResponse(
        id=appointment.id,
        barber_id=appointment.barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}" if barber else "Unknown",
        client_id=appointment.client_id,
        client_name=appointment.client.full_name if appointment.client else "Unknown",
        client_email=appointment.client.email if appointment.client else None,
        client_phone=appointment.client.phone if appointment.client else None,
        appointment_date=appointment.appointment_date,
        appointment_time=(
            appointment.appointment_time.time()
            if appointment.appointment_time
            else None
        ),
        status=appointment.status,
        service_name=appointment.service_name,
        service_duration=appointment.duration_minutes,
        service_price=appointment.service_revenue,
        service_revenue=appointment.service_revenue,
        tip_amount=appointment.tip_amount,
        product_revenue=appointment.product_revenue,
        total_amount=total_amount,
        customer_type=appointment.customer_type,
        source=appointment.booking_source,
        notes=appointment.barber_notes,
        created_at=appointment.created_at,
        client_history=client_history,
        previous_appointments=(
            client_history.get("total_appointments") if client_history else None
        ),
        total_spent=client_history.get("total_spent") if client_history else None,
        no_show_count=client_history.get("no_shows") if client_history else None,
        average_tip_percentage=(
            client_history.get("average_tip_percentage") if client_history else None
        ),
        preferred_services=(
            client_history.get("preferred_services") if client_history else None
        ),
        last_visit=client_history.get("last_visit") if client_history else None,
    )


@router.post("/recurring", response_model=List[AppointmentResponse])
async def create_recurring_appointments(
    recurring_request: RecurringAppointmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create recurring appointments"""
    rbac = RBACService(db)

    # Verify barber exists
    barber = (
        db.query(Barber)
        .filter(Barber.id == recurring_request.appointment_data.barber_id)
        .first()
    )
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions (same as single appointment)
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to create appointments for this barber",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only create own appointments",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to create appointments",
            )

    # Get or create client
    if recurring_request.appointment_data.client_id:
        client = (
            db.query(Client)
            .filter(Client.id == recurring_request.appointment_data.client_id)
            .first()
        )
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Client not found"
            )
    else:
        # Check if client exists by email/phone
        if recurring_request.appointment_data.client_email:
            client = (
                db.query(Client)
                .filter(Client.email == recurring_request.appointment_data.client_email)
                .first()
            )
        elif recurring_request.appointment_data.client_phone:
            client = (
                db.query(Client)
                .filter(Client.phone == recurring_request.appointment_data.client_phone)
                .first()
            )
        else:
            client = None

        if not client:
            # Create new client
            client_name = recurring_request.appointment_data.client_name
            client = Client(
                first_name=client_name.split()[0] if client_name else "Guest",
                last_name=(
                    " ".join(client_name.split()[1:])
                    if client_name and len(client_name.split()) > 1
                    else ""
                ),
                email=recurring_request.appointment_data.client_email,
                phone=recurring_request.appointment_data.client_phone,
                barber_id=recurring_request.appointment_data.barber_id,
            )
            db.add(client)
            db.commit()
            db.refresh(client)

    # Calculate recurring dates
    dates = []
    current_date = recurring_request.appointment_data.appointment_date

    for i in range(recurring_request.occurrences):
        # Skip holidays if requested
        if recurring_request.skip_holidays:
            # TODO: Implement holiday checking
            pass

        dates.append(current_date)

        # Calculate next date based on frequency
        if recurring_request.frequency == RecurrenceFrequency.DAILY:
            current_date += timedelta(days=1)
        elif recurring_request.frequency == RecurrenceFrequency.WEEKLY:
            current_date += timedelta(weeks=1)
        elif recurring_request.frequency == RecurrenceFrequency.BIWEEKLY:
            current_date += timedelta(weeks=2)
        elif recurring_request.frequency == RecurrenceFrequency.MONTHLY:
            # Add one month (handling different month lengths)
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                try:
                    current_date = current_date.replace(month=current_date.month + 1)
                except ValueError:
                    # Handle case where day doesn't exist in next month (e.g., Jan 31 -> Feb 31)
                    current_date = current_date.replace(
                        month=current_date.month + 1, day=1
                    ) + timedelta(days=-1)

    # Create appointments
    created_appointments = []
    for appointment_date in dates:
        # Check if slot is available
        existing = (
            db.query(Appointment)
            .filter(
                Appointment.barber_id == recurring_request.appointment_data.barber_id,
                Appointment.appointment_date == appointment_date,
                Appointment.appointment_time
                == recurring_request.appointment_data.appointment_time,
                Appointment.status.in_(["scheduled", "confirmed"]),
            )
            .first()
        )

        if existing:
            continue  # Skip this date if already booked

        new_appointment = Appointment(
            barber_id=recurring_request.appointment_data.barber_id,
            client_id=client.id,
            client_name=recurring_request.appointment_data.client_name,
            client_email=recurring_request.appointment_data.client_email,
            client_phone=recurring_request.appointment_data.client_phone,
            appointment_date=appointment_date,
            appointment_time=recurring_request.appointment_data.appointment_time,
            status="scheduled",
            service_id=recurring_request.appointment_data.service_id,
            service_name=recurring_request.appointment_data.service_name,
            service_duration=recurring_request.appointment_data.service_duration,
            service_price=recurring_request.appointment_data.service_price,
            customer_type="returning",  # Recurring appointments are always returning
            source="platform",
            notes=f"Recurring appointment ({recurring_request.frequency.value}). "
            + (recurring_request.appointment_data.notes or ""),
        )

        db.add(new_appointment)
        created_appointments.append(new_appointment)

    db.commit()

    # Send webhook notification for recurring appointments
    await send_webhook_notification(
        "appointment.recurring_created",
        {
            "barber_id": recurring_request.appointment_data.barber_id,
            "client_id": client.id,
            "frequency": recurring_request.frequency.value,
            "appointments_created": len(created_appointments),
            "appointment_ids": [apt.id for apt in created_appointments],
        },
    )

    # Refresh and return created appointments
    results = []
    for apt in created_appointments:
        db.refresh(apt)
        results.append(
            AppointmentResponse(
                id=apt.id,
                barber_id=apt.barber_id,
                barber_name=f"{barber.first_name} {barber.last_name}",
                client_id=apt.client_id,
                client_name=apt.client_name,
                client_email=apt.client_email,
                client_phone=apt.client_phone,
                appointment_date=apt.appointment_date,
                appointment_time=apt.appointment_time,
                status=apt.status,
                service_name=apt.service_name,
                service_duration=apt.service_duration,
                service_price=apt.service_price,
                service_revenue=apt.service_revenue,
                tip_amount=apt.tip_amount,
                product_revenue=apt.product_revenue,
                total_amount=apt.service_price,
                customer_type=apt.customer_type,
                source=apt.source,
                notes=apt.notes,
                created_at=apt.created_at,
            )
        )

    # TODO: Send confirmation email/webhook for recurring appointments

    return results


@router.get("/barbers/{barber_id}/schedule", response_model=BarberScheduleResponse)
async def get_barber_schedule(
    barber_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get barber's schedule and availability"""
    barber = (
        db.query(Barber)
        .options(joinedload(Barber.location))
        .filter(Barber.id == barber_id)
        .first()
    )

    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Get regular weekly schedule
    regular_schedule = (
        db.query(BarberAvailability)
        .filter(
            BarberAvailability.barber_id == barber_id,
            BarberAvailability.is_available == True,
        )
        .order_by(BarberAvailability.day_of_week)
        .all()
    )

    # Format regular hours
    regular_hours = []
    for schedule in regular_schedule:
        regular_hours.append(
            {
                "day_of_week": schedule.day_of_week.value,
                "day_name": schedule.day_of_week.name,
                "start_time": schedule.start_time.strftime("%H:%M"),
                "end_time": schedule.end_time.strftime("%H:%M"),
                "break_start": (
                    schedule.break_start.strftime("%H:%M")
                    if schedule.break_start
                    else None
                ),
                "break_end": (
                    schedule.break_end.strftime("%H:%M") if schedule.break_end else None
                ),
                "effective_from": (
                    schedule.effective_from.isoformat()
                    if schedule.effective_from
                    else None
                ),
                "effective_until": (
                    schedule.effective_until.isoformat()
                    if schedule.effective_until
                    else None
                ),
            }
        )

    # Get blocked times
    blocked_query = db.query(BookingSlot).filter(
        BookingSlot.barber_id == barber_id, BookingSlot.is_blocked == True
    )

    if start_date:
        blocked_query = blocked_query.filter(BookingSlot.slot_date >= start_date)
    if end_date:
        blocked_query = blocked_query.filter(BookingSlot.slot_date <= end_date)

    blocked_times = blocked_query.all()

    # Format blocked times
    blocked_list = []
    for block in blocked_times:
        blocked_list.append(
            {
                "date": block.slot_date.isoformat(),
                "start_time": block.start_time.strftime("%H:%M"),
                "end_time": block.end_time.strftime("%H:%M"),
                "reason": block.block_reason,
            }
        )

    # Get special availability (temporary schedule changes)
    special_query = db.query(BarberAvailability).filter(
        BarberAvailability.barber_id == barber_id,
        BarberAvailability.effective_from != None,
    )

    if start_date:
        special_query = special_query.filter(
            or_(
                BarberAvailability.effective_until >= start_date,
                BarberAvailability.effective_until == None,
            )
        )
    if end_date:
        special_query = special_query.filter(
            BarberAvailability.effective_from <= end_date
        )

    special_availability = special_query.all()

    # Format special availability
    special_list = []
    for special in special_availability:
        special_list.append(
            {
                "day_of_week": special.day_of_week.value,
                "start_time": special.start_time.strftime("%H:%M"),
                "end_time": special.end_time.strftime("%H:%M"),
                "is_available": special.is_available,
                "effective_from": special.effective_from.isoformat(),
                "effective_until": (
                    special.effective_until.isoformat()
                    if special.effective_until
                    else None
                ),
            }
        )

    return BarberScheduleResponse(
        barber_id=barber_id,
        barber_name=f"{barber.first_name} {barber.last_name}",
        location_id=barber.location_id,
        location_name=barber.location.name if barber.location else "Unknown",
        regular_hours=regular_hours,
        blocked_times=blocked_list,
        special_availability=special_list,
        timezone=barber.location.timezone if barber.location else "America/New_York",
    )


@router.put("/barbers/{barber_id}/availability")
async def update_barber_availability(
    barber_id: int,
    availability_updates: List[BarberAvailabilityUpdate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update barber availability"""
    rbac = RBACService(db)

    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_ALL_APPOINTMENTS):
        if rbac.has_permission(current_user, Permission.MANAGE_LOCATION_APPOINTMENTS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to update this barber's availability",
                )
        elif rbac.has_permission(current_user, Permission.MANAGE_OWN_APPOINTMENTS):
            if barber.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only update own availability",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permission to update availability",
            )

    # Process each availability update
    updated_count = 0

    for update in availability_updates:
        update_data = update.dict(exclude_unset=True)

        if "day_of_week" in update_data:
            # Update or create availability for specific day
            day_enum = DayOfWeek(update_data["day_of_week"])

            # Check if availability exists for this day
            existing = db.query(BarberAvailability).filter(
                BarberAvailability.barber_id == barber_id,
                BarberAvailability.day_of_week == day_enum,
            )

            # If date range specified, filter by it
            if "effective_from" in update_data:
                existing = existing.filter(
                    or_(
                        BarberAvailability.effective_from
                        == update_data["effective_from"],
                        BarberAvailability.effective_from == None,
                    )
                )

            availability = existing.first()

            if availability:
                # Update existing
                for field, value in update_data.items():
                    if field == "day_of_week":
                        continue  # Skip, already used for filtering
                    setattr(availability, field, value)
                updated_count += 1
            else:
                # Create new
                new_availability = BarberAvailability(
                    barber_id=barber_id,
                    location_id=barber.location_id,
                    day_of_week=day_enum,
                    **{k: v for k, v in update_data.items() if k != "day_of_week"},
                )
                db.add(new_availability)
                updated_count += 1

    db.commit()

    # Send webhook notification about availability change
    await send_webhook_notification(
        "barber.availability_updated",
        {
            "barber_id": barber_id,
            "updates_count": updated_count,
            "effective_from": datetime.utcnow().isoformat(),
        },
    )

    # Check if any existing appointments need to be rescheduled
    # This could be done asynchronously in a background task
    affected_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date >= date.today(),
            Appointment.status.in_(["scheduled", "confirmed"]),
        )
        .all()
    )

    if affected_appointments:
        logger.warning(
            f"Availability change may affect {len(affected_appointments)} appointments for barber {barber_id}"
        )

    return {
        "message": f"Successfully updated {updated_count} availability entries",
        "updated_count": updated_count,
    }


@router.post("/check-conflicts")
async def check_appointment_conflicts(
    conflict_request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check for appointment conflicts with enhanced conflict detection"""
    try:
        barber_id = conflict_request.get("barberId") or conflict_request.get(
            "barber_id"
        )
        service_id = conflict_request.get("serviceId") or conflict_request.get(
            "service_id", 1
        )
        appointment_date = conflict_request.get("date") or conflict_request.get(
            "appointment_date"
        )
        appointment_time = conflict_request.get("time") or conflict_request.get(
            "appointment_time"
        )
        duration = conflict_request.get("duration", 60)

        if not all([barber_id, appointment_date, appointment_time]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: barberId, date, time",
            )

        # Parse the date and time
        if isinstance(appointment_date, str):
            appointment_date = date.fromisoformat(appointment_date)

        if isinstance(appointment_time, str):
            time_parts = appointment_time.split(":")
            appointment_time = time(int(time_parts[0]), int(time_parts[1]))

        # Verify barber exists
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            return {
                "has_conflicts": True,
                "conflicts": [
                    {"type": "barber_not_found", "message": "Barber not found"}
                ],
            }

        conflicts = []

        # Check for existing appointments
        appointment_datetime = datetime.combine(appointment_date, appointment_time)
        end_datetime = appointment_datetime + timedelta(minutes=duration)

        existing_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date == appointment_date,
                Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
            )
            .all()
        )

        for existing in existing_appointments:
            if existing.appointment_time:
                existing_start = datetime.combine(
                    appointment_date, existing.appointment_time
                )
                existing_end = existing_start + timedelta(
                    minutes=existing.service_duration or 60
                )

                # Check for overlap
                if not (
                    end_datetime <= existing_start
                    or appointment_datetime >= existing_end
                ):
                    conflicts.append(
                        {
                            "type": "appointment_overlap",
                            "message": f"Conflicts with existing appointment at {existing.appointment_time}",
                            "appointment_id": existing.id,
                            "existing_time": str(existing.appointment_time),
                            "existing_client": existing.client_name,
                        }
                    )

        # Check barber availability
        day_of_week = appointment_date.weekday()
        availability = (
            db.query(BarberAvailability)
            .filter(
                BarberAvailability.barber_id == barber_id,
                BarberAvailability.day_of_week == DayOfWeek(day_of_week),
                BarberAvailability.is_available == True,
            )
            .filter(
                or_(
                    BarberAvailability.effective_from == None,
                    BarberAvailability.effective_from <= appointment_date,
                )
            )
            .filter(
                or_(
                    BarberAvailability.effective_until == None,
                    BarberAvailability.effective_until >= appointment_date,
                )
            )
            .first()
        )

        if not availability:
            conflicts.append(
                {
                    "type": "barber_unavailable",
                    "message": f"Barber is not available on {appointment_date.strftime('%A')}s",
                }
            )
        else:
            # Check if time is within working hours
            work_start = datetime.combine(appointment_date, availability.start_time)
            work_end = datetime.combine(appointment_date, availability.end_time)

            if appointment_datetime < work_start or end_datetime > work_end:
                conflicts.append(
                    {
                        "type": "outside_working_hours",
                        "message": f"Appointment time is outside working hours ({availability.start_time} - {availability.end_time})",
                    }
                )

            # Check break times
            if availability.break_start and availability.break_end:
                break_start = datetime.combine(
                    appointment_date, availability.break_start
                )
                break_end = datetime.combine(appointment_date, availability.break_end)

                if not (
                    end_datetime <= break_start or appointment_datetime >= break_end
                ):
                    conflicts.append(
                        {
                            "type": "break_time_conflict",
                            "message": f"Appointment conflicts with break time ({availability.break_start} - {availability.break_end})",
                        }
                    )

        # Check blocked slots
        blocked_slots = (
            db.query(BookingSlot)
            .filter(
                BookingSlot.barber_id == barber_id,
                BookingSlot.slot_date == appointment_date,
                BookingSlot.is_blocked == True,
            )
            .all()
        )

        for blocked in blocked_slots:
            blocked_start = datetime.combine(appointment_date, blocked.start_time)
            blocked_end = datetime.combine(appointment_date, blocked.end_time)

            if not (
                end_datetime <= blocked_start or appointment_datetime >= blocked_end
            ):
                conflicts.append(
                    {
                        "type": "time_blocked",
                        "message": f"Time slot is blocked: {blocked.block_reason or 'No reason specified'}",
                    }
                )

        # Check booking rules (advance booking requirements, etc.)
        if service_id:
            rules = (
                db.query(BookingRule)
                .filter(
                    BookingRule.is_active == True,
                    or_(
                        BookingRule.service_id == service_id,
                        BookingRule.barber_id == barber_id,
                        BookingRule.location_id == barber.location_id,
                    ),
                )
                .all()
            )

            for rule in rules:
                if rule.rule_type == "booking_window" and rule.parameters:
                    params = rule.parameters
                    min_hours = params.get("min_hours", 0)
                    min_booking_time = datetime.now() + timedelta(hours=min_hours)

                    if appointment_datetime < min_booking_time:
                        conflicts.append(
                            {
                                "type": "advance_booking_required",
                                "message": f"Must book at least {min_hours} hours in advance",
                            }
                        )

        # Suggest alternative slots if conflicts exist
        alternatives = []
        if conflicts:
            # Get next 5 available slots for the same day or next few days
            alternatives = await get_alternative_slots(
                db, barber_id, appointment_date, duration, service_id, max_suggestions=5
            )

        return {
            "has_conflicts": len(conflicts) > 0,
            "conflicts": conflicts,
            "suggested_alternatives": alternatives,
        }

    except Exception as e:
        logger.error(f"Error checking conflicts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking conflicts: {str(e)}",
        )


async def get_alternative_slots(
    db: Session,
    barber_id: int,
    preferred_date: date,
    duration: int,
    service_id: Optional[int] = None,
    max_suggestions: int = 5,
) -> List[Dict[str, Any]]:
    """Get alternative time slots for appointment booking"""
    alternatives = []

    # Check current day and next 7 days
    for days_ahead in range(8):
        check_date = preferred_date + timedelta(days=days_ahead)

        # Get availability for this date
        try:
            day_of_week = check_date.weekday()
            availability = (
                db.query(BarberAvailability)
                .filter(
                    BarberAvailability.barber_id == barber_id,
                    BarberAvailability.day_of_week == DayOfWeek(day_of_week),
                    BarberAvailability.is_available == True,
                )
                .filter(
                    or_(
                        BarberAvailability.effective_from == None,
                        BarberAvailability.effective_from <= check_date,
                    )
                )
                .filter(
                    or_(
                        BarberAvailability.effective_until == None,
                        BarberAvailability.effective_until >= check_date,
                    )
                )
                .first()
            )

            if not availability:
                continue

            # Get existing appointments for this date
            existing_appointments = (
                db.query(Appointment)
                .filter(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date == check_date,
                    Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
                )
                .all()
            )

            # Generate time slots
            start_time = datetime.combine(check_date, availability.start_time)
            end_time = datetime.combine(check_date, availability.end_time)
            slot_duration = timedelta(minutes=30)  # 30-minute increments

            current_slot = start_time
            while current_slot + timedelta(minutes=duration) <= end_time:
                slot_end = current_slot + timedelta(minutes=duration)

                # Check if slot is available
                is_available = True

                # Check against existing appointments
                for apt in existing_appointments:
                    if apt.appointment_time:
                        apt_start = datetime.combine(check_date, apt.appointment_time)
                        apt_end = apt_start + timedelta(
                            minutes=apt.service_duration or 60
                        )

                        if not (slot_end <= apt_start or current_slot >= apt_end):
                            is_available = False
                            break

                # Check break times
                if is_available and availability.break_start and availability.break_end:
                    break_start = datetime.combine(check_date, availability.break_start)
                    break_end = datetime.combine(check_date, availability.break_end)

                    if not (slot_end <= break_start or current_slot >= break_end):
                        is_available = False

                if is_available:
                    alternatives.append(
                        {
                            "date": check_date.isoformat(),
                            "time": current_slot.time().strftime("%H:%M"),
                            "barber_id": barber_id,
                            "day_name": check_date.strftime("%A"),
                            "score": 100 - (days_ahead * 10),  # Prefer sooner dates
                        }
                    )

                    if len(alternatives) >= max_suggestions:
                        return alternatives

                current_slot += slot_duration

        except Exception as e:
            logger.warning(f"Error getting alternatives for {check_date}: {e}")
            continue

    return alternatives
