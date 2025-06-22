"""
Barber management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta

from config.database import get_db
from models.user import User
from models.barber import Barber
from models.appointment import Appointment
from models.barber_payment import BarberPaymentModel, PaymentModelType
from services.sixfb_calculator import SixFBCalculator
from services.rbac_service import RBACService, Permission
from .auth import get_current_user
from pydantic import BaseModel, EmailStr

router = APIRouter()


# Pydantic models
class BarberCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    location_id: int
    user_id: Optional[int] = None
    commission_rate: float = 50.0


class BarberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location_id: Optional[int] = None
    commission_rate: Optional[float] = None


class PaymentModelResponse(BaseModel):
    id: Optional[int] = None
    barber_id: int
    payment_type: str
    booth_rent_amount: Optional[float] = None
    rent_frequency: Optional[str] = None
    service_commission_rate: Optional[float] = None
    product_commission_rate: Optional[float] = None
    stripe_connect_account_id: Optional[str] = None
    stripe_onboarding_completed: bool = False
    stripe_payouts_enabled: bool = False
    square_merchant_id: Optional[str] = None
    square_account_verified: bool = False
    rentredi_tenant_id: Optional[str] = None
    active: bool = True

    class Config:
        from_attributes = True


class BarberResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    location_id: Optional[int]
    location_name: Optional[str]
    user_id: Optional[int]
    commission_rate: float
    created_at: datetime
    sixfb_score: Optional[float] = None
    monthly_revenue: Optional[float] = None
    appointments_this_week: Optional[int] = None
    payment_model: Optional[PaymentModelResponse] = None

    class Config:
        from_attributes = True


class BarberSchedule(BaseModel):
    barber_id: int
    date: date
    available_slots: List[str]
    booked_slots: List[str]
    total_slots: int
    availability_percentage: float


# API Endpoints
@router.get("/", response_model=List[BarberResponse])
async def get_barbers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Get list of barbers"""
    # Temporarily bypass authentication for testing
    query = db.query(Barber)

    # Apply location filter
    if location_id:
        query = query.filter(Barber.location_id == location_id)

    barbers = query.offset(skip).limit(limit).all()

    # Add calculated fields
    calculator = SixFBCalculator(db)
    result = []

    for barber in barbers:
        barber_dict = {
            "id": barber.id,
            "first_name": barber.first_name,
            "last_name": barber.last_name,
            "email": barber.email,
            "phone": barber.phone,
            "location_id": barber.location_id,
            "location_name": None,
            "user_id": barber.user_id,
            "commission_rate": 30.0,
            "created_at": barber.created_at,
        }

        # Calculate 6FB score
        score_data = calculator.calculate_sixfb_score(barber.id, "weekly")
        barber_dict["sixfb_score"] = score_data.get("overall_score", 0)

        # Calculate monthly revenue
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        appointments = (
            db.query(Appointment)
            .filter(
                Appointment.barber_id == barber.id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == "completed",
            )
            .all()
        )

        monthly_revenue = sum(
            (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
            for a in appointments
        )
        barber_dict["monthly_revenue"] = monthly_revenue

        # Count appointments this week
        week_start = date.today() - timedelta(days=date.today().weekday())
        week_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.barber_id == barber.id,
                Appointment.appointment_date >= week_start,
                Appointment.status.in_(["scheduled", "completed"]),
            )
            .count()
        )
        barber_dict["appointments_this_week"] = week_appointments

        # Get payment model data
        payment_model = (
            db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == barber.id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if payment_model:
            barber_dict["payment_model"] = {
                "id": payment_model.id,
                "barber_id": payment_model.barber_id,
                "payment_type": (
                    payment_model.payment_type.value
                    if payment_model.payment_type
                    else None
                ),
                "booth_rent_amount": (
                    float(payment_model.booth_rent_amount)
                    if payment_model.booth_rent_amount
                    else None
                ),
                "rent_frequency": payment_model.rent_frequency,
                "service_commission_rate": payment_model.service_commission_rate,
                "product_commission_rate": payment_model.product_commission_rate,
                "stripe_connect_account_id": payment_model.stripe_connect_account_id,
                "stripe_onboarding_completed": payment_model.stripe_onboarding_completed,
                "stripe_payouts_enabled": payment_model.stripe_payouts_enabled,
                "square_merchant_id": payment_model.square_merchant_id,
                "square_account_verified": payment_model.square_account_verified,
                "rentredi_tenant_id": payment_model.rentredi_tenant_id,
                "active": payment_model.active,
            }

        result.append(BarberResponse(**barber_dict))

    return result


@router.delete("/{barber_id}")
async def delete_barber(
    barber_id: int,
    db: Session = Depends(get_db),
):
    """Delete a barber"""
    # Find the barber
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Delete related records first to avoid foreign key constraints
    try:
        # Delete payment models
        db.query(BarberPaymentModel).filter(
            BarberPaymentModel.barber_id == barber_id
        ).delete()

        # Delete any other related records here if needed
        # db.query(OtherModel).filter(OtherModel.barber_id == barber_id).delete()

        # Now delete the barber
        db.delete(barber)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete barber due to existing relationships: {str(e)}",
        )

    return {"message": "Barber deleted successfully"}


@router.post("/")
async def create_barber(
    barber_data: BarberCreate,
    db: Session = Depends(get_db),
):
    """Create new barber"""
    # Temporarily bypass authentication for testing

    # Check if email already exists
    existing = db.query(Barber).filter(Barber.email == barber_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create barber (exclude fields that don't exist in Barber model)
    barber_dict = barber_data.dict()
    payment_model_data = barber_dict.pop("payment_model", None)
    barber_dict.pop("commission_rate", None)  # Remove if exists

    new_barber = Barber(**barber_dict)
    db.add(new_barber)
    db.commit()
    db.refresh(new_barber)

    return {
        "id": new_barber.id,
        "first_name": new_barber.first_name,
        "last_name": new_barber.last_name,
        "email": new_barber.email,
        "phone": new_barber.phone,
        "location_id": new_barber.location_id,
        "is_active": new_barber.is_active,
        "is_verified": new_barber.is_verified,
        "user_id": new_barber.user_id,
        "message": "Barber created successfully",
    }


@router.get("/{barber_id}", response_model=BarberResponse)
async def get_barber(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get specific barber"""
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    rbac = RBACService(db)
    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this barber",
                )

    # Calculate additional fields
    calculator = SixFBCalculator(db)
    score_data = calculator.calculate_sixfb_score(barber_id, "weekly")

    # Calculate monthly revenue
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date,
            Appointment.status == "completed",
        )
        .all()
    )

    monthly_revenue = sum(
        (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
        for a in appointments
    )

    # Count appointments this week
    week_start = date.today() - timedelta(days=date.today().weekday())
    week_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date >= week_start,
            Appointment.status.in_(["scheduled", "completed"]),
        )
        .count()
    )

    return BarberResponse(
        id=barber.id,
        first_name=barber.first_name,
        last_name=barber.last_name,
        email=barber.email,
        phone=barber.phone,
        location_id=barber.location_id,
        location_name=barber.location.name if barber.location else None,
        user_id=barber.user_id,
        commission_rate=barber.commission_rate,
        created_at=barber.created_at,
        sixfb_score=score_data.get("overall_score", 0),
        monthly_revenue=monthly_revenue,
        appointments_this_week=week_appointments,
    )


@router.put("/{barber_id}", response_model=BarberResponse)
async def update_barber(
    barber_id: int,
    barber_update: BarberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update barber information"""
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    rbac = RBACService(db)
    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.MANAGE_USERS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to update this barber",
                )

    # Update fields
    update_data = barber_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(barber, field, value)

    barber.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(barber)

    return BarberResponse(
        id=barber.id,
        first_name=barber.first_name,
        last_name=barber.last_name,
        email=barber.email,
        phone=barber.phone,
        location_id=barber.location_id,
        location_name=barber.location.name if barber.location else None,
        user_id=barber.user_id,
        commission_rate=barber.commission_rate,
        created_at=barber.created_at,
    )


@router.get("/{barber_id}/schedule")
async def get_barber_schedule(
    barber_id: int,
    date: date = Query(default=date.today()),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get barber's schedule for a specific date"""
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Get appointments for the date
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id, Appointment.appointment_date == date
        )
        .all()
    )

    # Define time slots (9 AM to 8 PM, 30-minute slots)
    all_slots = []
    start_hour = 9
    end_hour = 20

    for hour in range(start_hour, end_hour):
        all_slots.append(f"{hour:02d}:00")
        all_slots.append(f"{hour:02d}:30")

    # Get booked slots
    booked_slots = []
    for appointment in appointments:
        if appointment.appointment_time and appointment.status != "cancelled":
            time_str = appointment.appointment_time.strftime("%H:%M")
            booked_slots.append(time_str)

    # Calculate available slots
    available_slots = [slot for slot in all_slots if slot not in booked_slots]

    return BarberSchedule(
        barber_id=barber_id,
        date=date,
        available_slots=available_slots,
        booked_slots=booked_slots,
        total_slots=len(all_slots),
        availability_percentage=(
            (len(available_slots) / len(all_slots) * 100) if all_slots else 0
        ),
    )


@router.get("/{barber_id}/performance")
async def get_barber_performance(
    barber_id: int,
    period_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get barber performance metrics"""
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check permissions
    rbac = RBACService(db)
    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            accessible_locations = rbac.get_accessible_locations(current_user)
            if barber.location_id not in accessible_locations:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No permission to view this barber's performance",
                )

    # Get performance data
    calculator = SixFBCalculator(db)
    end_date = date.today()
    start_date = end_date - timedelta(days=period_days)

    # Calculate metrics
    score_data = calculator.calculate_sixfb_score(barber_id, "monthly")

    # Get appointments
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date,
        )
        .all()
    )

    completed = [a for a in appointments if a.status == "completed"]
    revenue = sum(
        (a.service_revenue or 0) + (a.tip_amount or 0) + (a.product_revenue or 0)
        for a in completed
    )

    # Calculate client metrics
    unique_clients = len(set(a.client_id for a in completed if a.client_id))
    new_clients = len([a for a in completed if a.customer_type == "new"])
    returning_clients = len([a for a in completed if a.customer_type == "returning"])

    return {
        "barber_id": barber_id,
        "barber_name": f"{barber.first_name} {barber.last_name}",
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": period_days,
        },
        "sixfb_score": score_data.get("overall_score", 0),
        "score_components": score_data.get("components", {}),
        "revenue": {
            "total": revenue,
            "average_per_appointment": revenue / len(completed) if completed else 0,
            "appointments_count": len(completed),
        },
        "client_metrics": {
            "total_clients": unique_clients,
            "new_clients": new_clients,
            "returning_clients": returning_clients,
            "retention_rate": (
                (returning_clients / (new_clients + returning_clients) * 100)
                if (new_clients + returning_clients) > 0
                else 0
            ),
        },
        "efficiency": {
            "completion_rate": (
                (len(completed) / len(appointments) * 100) if appointments else 0
            ),
            "no_show_rate": (
                (
                    len([a for a in appointments if a.status == "no_show"])
                    / len(appointments)
                    * 100
                )
                if appointments
                else 0
            ),
        },
    }
