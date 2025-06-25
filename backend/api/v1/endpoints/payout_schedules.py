"""
Payout Schedule Management API Endpoints

Comprehensive CRUD operations for managing automated payout schedules,
manual payouts, and payout analytics.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from pydantic import BaseModel, Field, validator
import logging

from config.database import get_db
from models.payout_schedule import (
    PayoutSchedule,
    ScheduledPayout,
    PayoutEarning,
    PayoutNotification,
    PayoutFrequency,
    PayoutStatus,
    PayoutType,
)
from models.barber import Barber
from models.barber_payment import BarberPaymentModel, CommissionPayment
from models.payment import Payment
from models.appointment import Appointment
from models.user import User
from api.v1.auth import get_current_user
from services.rbac_service import RBACService, Permission
from services.stripe_connect_service import StripeConnectService
from services.notification_service import NotificationService
from services.payout_scheduler_service import PayoutSchedulerService

logger = logging.getLogger(__name__)
router = APIRouter()

# ========== Pydantic Models ==========


class PayoutScheduleBase(BaseModel):
    """Base model for payout schedule data"""

    frequency: PayoutFrequency
    day_of_week: Optional[int] = Field(
        None, ge=0, le=6, description="0=Monday, 6=Sunday"
    )
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    custom_interval_days: Optional[int] = Field(None, ge=1)
    minimum_payout_amount: float = Field(25.00, ge=0)
    auto_payout_enabled: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False
    advance_notice_days: int = Field(1, ge=0, le=7)
    preferred_payment_method: str = "stripe"
    backup_payment_method: Optional[str] = None

    @validator("day_of_week")
    def validate_day_of_week(cls, v, values):
        if values.get("frequency") == PayoutFrequency.WEEKLY and v is None:
            raise ValueError("day_of_week is required for weekly frequency")
        return v

    @validator("day_of_month")
    def validate_day_of_month(cls, v, values):
        if values.get("frequency") == PayoutFrequency.MONTHLY and v is None:
            raise ValueError("day_of_month is required for monthly frequency")
        return v

    @validator("custom_interval_days")
    def validate_custom_interval(cls, v, values):
        if values.get("frequency") == PayoutFrequency.CUSTOM and v is None:
            raise ValueError("custom_interval_days is required for custom frequency")
        return v


class PayoutScheduleCreate(PayoutScheduleBase):
    """Model for creating a new payout schedule"""

    barber_id: int


class PayoutScheduleUpdate(BaseModel):
    """Model for updating an existing payout schedule"""

    frequency: Optional[PayoutFrequency] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    custom_interval_days: Optional[int] = None
    minimum_payout_amount: Optional[float] = None
    auto_payout_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    advance_notice_days: Optional[int] = None
    preferred_payment_method: Optional[str] = None
    backup_payment_method: Optional[str] = None
    is_active: Optional[bool] = None


class PayoutScheduleResponse(PayoutScheduleBase):
    """Response model for payout schedule"""

    id: int
    barber_id: int
    barber_name: str
    is_active: bool
    last_payout_date: Optional[datetime]
    next_payout_date: Optional[datetime]
    total_payouts_sent: int
    total_amount_paid: float
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ScheduledPayoutResponse(BaseModel):
    """Response model for scheduled payouts"""

    id: int
    barber_id: int
    barber_name: str
    payout_type: PayoutType
    amount: float
    currency: str
    period_start: datetime
    period_end: datetime
    status: PayoutStatus
    scheduled_date: datetime
    processed_date: Optional[datetime]
    payment_method: str
    platform_payout_id: Optional[str]
    platform_fee: float
    net_amount: float
    failure_reason: Optional[str]
    retry_count: int
    notification_sent: bool
    created_at: datetime

    class Config:
        orm_mode = True


class PayoutHistoryItem(BaseModel):
    """Single payout history item"""

    id: int
    date: datetime
    amount: float
    net_amount: float
    fee: float
    status: str
    payment_method: str
    period_start: datetime
    period_end: datetime
    earnings_count: int
    failure_reason: Optional[str] = None


class PayoutHistoryResponse(BaseModel):
    """Response model for payout history"""

    total_count: int
    total_amount: float
    payouts: List[PayoutHistoryItem]


class PayoutAnalytics(BaseModel):
    """Analytics data for payouts"""

    total_paid_out: float
    total_pending: float
    average_payout_amount: float
    total_fees_paid: float
    payouts_by_status: Dict[str, int]
    payouts_by_method: Dict[str, float]
    monthly_trend: List[Dict[str, Any]]
    next_scheduled_payouts: List[Dict[str, Any]]


class ManualPayoutRequest(BaseModel):
    """Request model for manual payout"""

    barber_id: int
    amount: float = Field(..., gt=0)
    payout_type: PayoutType = PayoutType.COMMISSION
    payment_method: str = "stripe"
    description: Optional[str] = None
    process_immediately: bool = True


class BulkPayoutRequest(BaseModel):
    """Request model for bulk payouts"""

    barber_ids: List[int]
    payment_method: str = "stripe"
    process_immediately: bool = False
    notify_barbers: bool = True


class PayoutEarningResponse(BaseModel):
    """Response model for payout earnings"""

    id: int
    appointment_id: Optional[int]
    earning_type: str
    gross_amount: float
    commission_rate: Optional[float]
    commission_amount: float
    earned_date: datetime
    service_name: Optional[str]
    customer_name: Optional[str]

    class Config:
        orm_mode = True


# ========== CRUD Endpoints ==========


@router.post(
    "/schedules",
    response_model=PayoutScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payout_schedule(
    schedule_data: PayoutScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new payout schedule for a barber.

    Requires MANAGE_PAYMENTS permission or barber creating their own schedule.
    """
    rbac = RBACService(db)

    # Check permissions
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        if not barber or barber.id != schedule_data.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create schedules for yourself",
            )

    # Verify barber exists
    target_barber = (
        db.query(Barber).filter(Barber.id == schedule_data.barber_id).first()
    )
    if not target_barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check if schedule already exists
    existing = (
        db.query(PayoutSchedule)
        .filter(
            PayoutSchedule.barber_id == schedule_data.barber_id,
            PayoutSchedule.is_active == True,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active payout schedule already exists for this barber",
        )

    # Create new schedule
    schedule = PayoutSchedule(**schedule_data.dict())

    # Calculate next payout date
    scheduler_service = PayoutSchedulerService(db)
    schedule.next_payout_date = scheduler_service.calculate_next_payout_date(schedule)

    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    # Get barber name for response
    barber_user = target_barber.user if hasattr(target_barber, "user") else None
    barber_name = (
        f"{barber_user.first_name} {barber_user.last_name}"
        if barber_user
        else "Unknown"
    )

    return PayoutScheduleResponse(**schedule.__dict__, barber_name=barber_name)


@router.get("/schedules", response_model=List[PayoutScheduleResponse])
async def get_payout_schedules(
    barber_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    frequency: Optional[PayoutFrequency] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get payout schedules with optional filters.

    Admins can see all schedules, barbers can only see their own.
    """
    rbac = RBACService(db)

    # Build query
    query = db.query(PayoutSchedule).join(Barber)

    # Apply permission filters
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            query = query.filter(PayoutSchedule.barber_id == barber.id)
        else:
            return []

    # Apply filters
    if barber_id:
        query = query.filter(PayoutSchedule.barber_id == barber_id)
    if is_active is not None:
        query = query.filter(PayoutSchedule.is_active == is_active)
    if frequency:
        query = query.filter(PayoutSchedule.frequency == frequency)

    # Get schedules
    schedules = query.offset(skip).limit(limit).all()

    # Build response
    response = []
    for schedule in schedules:
        barber_user = schedule.barber.user if hasattr(schedule.barber, "user") else None
        barber_name = (
            f"{barber_user.first_name} {barber_user.last_name}"
            if barber_user
            else "Unknown"
        )

        response.append(
            PayoutScheduleResponse(**schedule.__dict__, barber_name=barber_name)
        )

    return response


@router.get("/schedules/{schedule_id}", response_model=PayoutScheduleResponse)
async def get_payout_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific payout schedule by ID."""
    rbac = RBACService(db)

    # Get schedule
    schedule = db.query(PayoutSchedule).filter(PayoutSchedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout schedule not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != schedule.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Get barber name
    barber_user = schedule.barber.user if hasattr(schedule.barber, "user") else None
    barber_name = (
        f"{barber_user.first_name} {barber_user.last_name}"
        if barber_user
        else "Unknown"
    )

    return PayoutScheduleResponse(**schedule.__dict__, barber_name=barber_name)


@router.put("/schedules/{schedule_id}", response_model=PayoutScheduleResponse)
async def update_payout_schedule(
    schedule_id: int,
    update_data: PayoutScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing payout schedule."""
    rbac = RBACService(db)

    # Get schedule
    schedule = db.query(PayoutSchedule).filter(PayoutSchedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout schedule not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != schedule.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(schedule, field, value)

    # Recalculate next payout date if frequency changed
    if any(
        field in update_dict
        for field in [
            "frequency",
            "day_of_week",
            "day_of_month",
            "custom_interval_days",
        ]
    ):
        scheduler_service = PayoutSchedulerService(db)
        schedule.next_payout_date = scheduler_service.calculate_next_payout_date(
            schedule
        )

    schedule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(schedule)

    # Get barber name
    barber_user = schedule.barber.user if hasattr(schedule.barber, "user") else None
    barber_name = (
        f"{barber_user.first_name} {barber_user.last_name}"
        if barber_user
        else "Unknown"
    )

    return PayoutScheduleResponse(**schedule.__dict__, barber_name=barber_name)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payout_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete (deactivate) a payout schedule.

    Schedules are soft-deleted by setting is_active to False.
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get schedule
    schedule = db.query(PayoutSchedule).filter(PayoutSchedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout schedule not found"
        )

    # Soft delete
    schedule.is_active = False
    schedule.updated_at = datetime.utcnow()
    db.commit()


# ========== Payout History Endpoints ==========


@router.get("/history", response_model=PayoutHistoryResponse)
async def get_payout_history(
    barber_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[PayoutStatus] = None,
    payment_method: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get payout history with comprehensive filtering options.

    Returns detailed payout information including earnings breakdown.
    """
    rbac = RBACService(db)

    # Build query
    query = db.query(ScheduledPayout).join(Barber)

    # Apply permission filters
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            query = query.filter(ScheduledPayout.barber_id == barber.id)
        else:
            return PayoutHistoryResponse(total_count=0, total_amount=0, payouts=[])

    # Apply filters
    if barber_id:
        query = query.filter(ScheduledPayout.barber_id == barber_id)
    if start_date:
        query = query.filter(ScheduledPayout.scheduled_date >= start_date)
    if end_date:
        query = query.filter(ScheduledPayout.scheduled_date <= end_date)
    if status:
        query = query.filter(ScheduledPayout.status == status)
    if payment_method:
        query = query.filter(ScheduledPayout.payment_method == payment_method)

    # Get total count and amount
    total_count = query.count()
    total_amount = (
        db.query(func.sum(ScheduledPayout.amount))
        .filter(ScheduledPayout.id.in_([p.id for p in query.all()]))
        .scalar()
        or 0
    )

    # Get paginated results
    payouts = (
        query.order_by(desc(ScheduledPayout.scheduled_date))
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Build response
    history_items = []
    for payout in payouts:
        # Get earnings count
        earnings_count = (
            db.query(PayoutEarning)
            .filter(PayoutEarning.scheduled_payout_id == payout.id)
            .count()
        )

        history_items.append(
            PayoutHistoryItem(
                id=payout.id,
                date=payout.scheduled_date,
                amount=float(payout.amount),
                net_amount=float(payout.net_amount or payout.amount),
                fee=float(payout.platform_fee or 0),
                status=payout.status.value,
                payment_method=payout.payment_method,
                period_start=payout.period_start,
                period_end=payout.period_end,
                earnings_count=earnings_count,
                failure_reason=payout.failure_reason,
            )
        )

    return PayoutHistoryResponse(
        total_count=total_count, total_amount=float(total_amount), payouts=history_items
    )


@router.get("/history/{payout_id}", response_model=ScheduledPayoutResponse)
async def get_payout_details(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed information about a specific payout."""
    rbac = RBACService(db)

    # Get payout
    payout = db.query(ScheduledPayout).filter(ScheduledPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != payout.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Get barber name
    barber_user = payout.barber.user if hasattr(payout.barber, "user") else None
    barber_name = (
        f"{barber_user.first_name} {barber_user.last_name}"
        if barber_user
        else "Unknown"
    )

    return ScheduledPayoutResponse(**payout.__dict__, barber_name=barber_name)


@router.get("/history/{payout_id}/earnings", response_model=List[PayoutEarningResponse])
async def get_payout_earnings(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed earnings breakdown for a specific payout."""
    rbac = RBACService(db)

    # Get payout to check permissions
    payout = db.query(ScheduledPayout).filter(ScheduledPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != payout.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Get earnings
    earnings = (
        db.query(PayoutEarning)
        .filter(PayoutEarning.scheduled_payout_id == payout_id)
        .order_by(desc(PayoutEarning.earned_date))
        .all()
    )

    return [PayoutEarningResponse.from_orm(earning) for earning in earnings]


# ========== Manual Payout Endpoints ==========


@router.post(
    "/manual",
    response_model=ScheduledPayoutResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_manual_payout(
    payout_data: ManualPayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a manual payout for a barber.

    Can optionally process immediately through payment platform.
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == payout_data.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Get payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == payout_data.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active payment model found for barber",
        )

    # Verify payment method setup
    if (
        payout_data.payment_method == "stripe"
        and not payment_model.stripe_connect_account_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not completed Stripe Connect setup",
        )

    try:
        # Create scheduled payout
        payout = ScheduledPayout(
            barber_id=payout_data.barber_id,
            payout_type=payout_data.payout_type,
            amount=payout_data.amount,
            currency="USD",
            period_start=datetime.utcnow() - timedelta(days=7),
            period_end=datetime.utcnow(),
            status=PayoutStatus.PENDING,
            scheduled_date=datetime.utcnow(),
            payment_method=payout_data.payment_method,
            net_amount=payout_data.amount,  # Will be updated if processed
        )

        # Get schedule if exists
        schedule = (
            db.query(PayoutSchedule)
            .filter(
                PayoutSchedule.barber_id == payout_data.barber_id,
                PayoutSchedule.is_active == True,
            )
            .first()
        )

        if schedule:
            payout.schedule_id = schedule.id

        db.add(payout)
        db.flush()  # Get ID before processing

        # Process immediately if requested
        if payout_data.process_immediately:
            if payout_data.payment_method == "stripe":
                stripe_service = StripeConnectService()

                # Calculate fee
                fee = payout_data.amount * 0.029  # 2.9% Stripe fee
                net_amount = payout_data.amount - fee

                # Create transfer
                transfer = stripe_service.create_transfer(
                    amount=int(net_amount * 100),  # Convert to cents
                    destination=payment_model.stripe_connect_account_id,
                    description=payout_data.description
                    or f"Manual payout - {payout_data.payout_type.value}",
                )

                # Update payout
                payout.status = PayoutStatus.COMPLETED
                payout.processed_date = datetime.utcnow()
                payout.platform_payout_id = transfer["id"]
                payout.platform_fee = fee
                payout.net_amount = net_amount

        db.commit()
        db.refresh(payout)

        # Send notification
        if payout.status == PayoutStatus.COMPLETED:
            notification_service = NotificationService(db)
            notification_service.send_payout_notification(
                payout_id=payout.id, notification_type="completed"
            )

        # Get barber name for response
        barber_user = barber.user if hasattr(barber, "user") else None
        barber_name = (
            f"{barber_user.first_name} {barber_user.last_name}"
            if barber_user
            else "Unknown"
        )

        return ScheduledPayoutResponse(**payout.__dict__, barber_name=barber_name)

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create manual payout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payout: {str(e)}",
        )


@router.post("/bulk", response_model=Dict[str, Any])
async def create_bulk_payouts(
    bulk_data: BulkPayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create payouts for multiple barbers at once.

    Useful for end-of-period processing.
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    scheduler_service = PayoutSchedulerService(db)
    results = {"successful": [], "failed": [], "total_amount": 0}

    for barber_id in bulk_data.barber_ids:
        try:
            # Calculate pending earnings
            earnings = scheduler_service.calculate_pending_earnings(barber_id)

            if earnings["total_amount"] > 0:
                # Create payout
                payout = scheduler_service.create_scheduled_payout(
                    barber_id=barber_id,
                    earnings=earnings,
                    payment_method=bulk_data.payment_method,
                )

                # Process if requested
                if bulk_data.process_immediately:
                    scheduler_service.process_payout(payout.id)

                results["successful"].append(
                    {
                        "barber_id": barber_id,
                        "payout_id": payout.id,
                        "amount": float(payout.amount),
                    }
                )
                results["total_amount"] += float(payout.amount)

                # Send notification if requested
                if bulk_data.notify_barbers:
                    notification_service = NotificationService(db)
                    notification_service.send_payout_notification(
                        payout_id=payout.id,
                        notification_type=(
                            "processing"
                            if bulk_data.process_immediately
                            else "advance_notice"
                        ),
                    )
            else:
                results["failed"].append(
                    {"barber_id": barber_id, "reason": "No pending earnings"}
                )

        except Exception as e:
            logger.error(f"Failed to create payout for barber {barber_id}: {str(e)}")
            results["failed"].append({"barber_id": barber_id, "reason": str(e)})

    return results


# ========== Payout Processing Endpoints ==========


@router.post("/{payout_id}/process", response_model=ScheduledPayoutResponse)
async def process_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process a pending payout through the payment platform."""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    scheduler_service = PayoutSchedulerService(db)

    try:
        payout = scheduler_service.process_payout(payout_id)

        # Get barber name for response
        barber = payout.barber
        barber_user = barber.user if hasattr(barber, "user") else None
        barber_name = (
            f"{barber_user.first_name} {barber_user.last_name}"
            if barber_user
            else "Unknown"
        )

        return ScheduledPayoutResponse(**payout.__dict__, barber_name=barber_name)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to process payout {payout_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.post("/{payout_id}/retry", response_model=ScheduledPayoutResponse)
async def retry_failed_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retry a failed payout."""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get payout
    payout = db.query(ScheduledPayout).filter(ScheduledPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found"
        )

    if payout.status != PayoutStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed payouts can be retried",
        )

    if payout.retry_count >= payout.max_retries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum retry attempts exceeded",
        )

    # Reset status and increment retry count
    payout.status = PayoutStatus.PENDING
    payout.retry_count += 1
    payout.failure_reason = None
    payout.next_retry_date = None
    db.commit()

    # Process the payout
    scheduler_service = PayoutSchedulerService(db)

    try:
        payout = scheduler_service.process_payout(payout_id)

        # Get barber name for response
        barber = payout.barber
        barber_user = barber.user if hasattr(barber, "user") else None
        barber_name = (
            f"{barber_user.first_name} {barber_user.last_name}"
            if barber_user
            else "Unknown"
        )

        return ScheduledPayoutResponse(**payout.__dict__, barber_name=barber_name)

    except Exception as e:
        logger.error(f"Failed to retry payout {payout_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry payout: {str(e)}",
        )


@router.post("/{payout_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_payout(
    payout_id: int,
    reason: str = Body(..., description="Reason for cancellation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending payout."""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get payout
    payout = db.query(ScheduledPayout).filter(ScheduledPayout.id == payout_id).first()

    if not payout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found"
        )

    if payout.status not in [PayoutStatus.PENDING, PayoutStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending or failed payouts can be cancelled",
        )

    # Cancel payout
    payout.status = PayoutStatus.CANCELLED
    payout.failure_reason = f"Cancelled by admin: {reason}"
    payout.updated_at = datetime.utcnow()

    db.commit()

    # Send notification
    notification_service = NotificationService(db)
    notification_service.send_payout_notification(
        payout_id=payout_id,
        notification_type="failed",
        custom_message=f"Your payout has been cancelled: {reason}",
    )


# ========== Analytics Endpoints ==========


@router.get("/analytics", response_model=PayoutAnalytics)
async def get_payout_analytics(
    barber_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive payout analytics.

    Includes totals, trends, and upcoming payouts.
    """
    rbac = RBACService(db)

    # Build base query
    query = db.query(ScheduledPayout)

    # Apply permission filters
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            query = query.filter(ScheduledPayout.barber_id == barber.id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Apply filters
    if barber_id:
        query = query.filter(ScheduledPayout.barber_id == barber_id)
    if start_date:
        query = query.filter(ScheduledPayout.scheduled_date >= start_date)
    if end_date:
        query = query.filter(ScheduledPayout.scheduled_date <= end_date)

    # Calculate totals
    total_paid_out = (
        db.query(func.sum(ScheduledPayout.amount))
        .filter(ScheduledPayout.status == PayoutStatus.COMPLETED)
        .scalar()
        or 0
    )

    total_pending = (
        db.query(func.sum(ScheduledPayout.amount))
        .filter(ScheduledPayout.status == PayoutStatus.PENDING)
        .scalar()
        or 0
    )

    # Average payout amount
    avg_payout = (
        db.query(func.avg(ScheduledPayout.amount))
        .filter(ScheduledPayout.status == PayoutStatus.COMPLETED)
        .scalar()
        or 0
    )

    # Total fees
    total_fees = (
        db.query(func.sum(ScheduledPayout.platform_fee))
        .filter(ScheduledPayout.status == PayoutStatus.COMPLETED)
        .scalar()
        or 0
    )

    # Payouts by status
    status_counts = (
        db.query(ScheduledPayout.status, func.count(ScheduledPayout.id))
        .group_by(ScheduledPayout.status)
        .all()
    )

    payouts_by_status = {status.value: count for status, count in status_counts}

    # Payouts by method
    method_amounts = (
        db.query(ScheduledPayout.payment_method, func.sum(ScheduledPayout.amount))
        .filter(ScheduledPayout.status == PayoutStatus.COMPLETED)
        .group_by(ScheduledPayout.payment_method)
        .all()
    )

    payouts_by_method = {method: float(amount) for method, amount in method_amounts}

    # Monthly trend (last 6 months)
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_data = (
        db.query(
            func.date_trunc("month", ScheduledPayout.scheduled_date).label("month"),
            func.count(ScheduledPayout.id).label("count"),
            func.sum(ScheduledPayout.amount).label("total"),
        )
        .filter(
            ScheduledPayout.scheduled_date >= six_months_ago,
            ScheduledPayout.status == PayoutStatus.COMPLETED,
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    monthly_trend = [
        {"month": month.strftime("%Y-%m"), "count": count, "total": float(total)}
        for month, count, total in monthly_data
    ]

    # Next scheduled payouts
    upcoming_payouts = (
        db.query(
            ScheduledPayout.barber_id,
            Barber.first_name,
            Barber.last_name,
            ScheduledPayout.scheduled_date,
            ScheduledPayout.amount,
        )
        .join(Barber)
        .filter(
            ScheduledPayout.status == PayoutStatus.PENDING,
            ScheduledPayout.scheduled_date >= datetime.utcnow(),
        )
        .order_by(ScheduledPayout.scheduled_date)
        .limit(10)
        .all()
    )

    next_scheduled = [
        {
            "barber_id": barber_id,
            "barber_name": f"{first_name} {last_name}",
            "scheduled_date": scheduled_date.isoformat(),
            "amount": float(amount),
        }
        for barber_id, first_name, last_name, scheduled_date, amount in upcoming_payouts
    ]

    return PayoutAnalytics(
        total_paid_out=float(total_paid_out),
        total_pending=float(total_pending),
        average_payout_amount=float(avg_payout),
        total_fees_paid=float(total_fees),
        payouts_by_status=payouts_by_status,
        payouts_by_method=payouts_by_method,
        monthly_trend=monthly_trend,
        next_scheduled_payouts=next_scheduled,
    )


@router.get("/reports/summary", response_model=Dict[str, Any])
async def get_payout_summary_report(
    period: str = Query(
        "monthly", description="Period: daily, weekly, monthly, quarterly"
    ),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a summary report of payouts for the specified period.

    Useful for accounting and reconciliation.
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Determine date range
    end_date = datetime.utcnow()
    if period == "daily":
        start_date = end_date - timedelta(days=1)
    elif period == "weekly":
        start_date = end_date - timedelta(days=7)
    elif period == "monthly":
        start_date = end_date - timedelta(days=30)
    elif period == "quarterly":
        start_date = end_date - timedelta(days=90)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid period specified"
        )

    # Build query
    query = db.query(ScheduledPayout).filter(
        ScheduledPayout.scheduled_date >= start_date,
        ScheduledPayout.scheduled_date <= end_date,
    )

    if barber_id:
        query = query.filter(ScheduledPayout.barber_id == barber_id)

    # Get payouts
    payouts = query.all()

    # Calculate summary
    summary = {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_payouts": len(payouts),
        "total_amount": sum(p.amount for p in payouts),
        "total_fees": sum(p.platform_fee or 0 for p in payouts),
        "net_amount": sum(p.net_amount or p.amount for p in payouts),
        "by_status": {},
        "by_method": {},
        "by_barber": [],
    }

    # Group by status
    for status in PayoutStatus:
        count = len([p for p in payouts if p.status == status])
        amount = sum(p.amount for p in payouts if p.status == status)
        summary["by_status"][status.value] = {"count": count, "amount": float(amount)}

    # Group by method
    methods = set(p.payment_method for p in payouts if p.payment_method)
    for method in methods:
        count = len([p for p in payouts if p.payment_method == method])
        amount = sum(p.amount for p in payouts if p.payment_method == method)
        summary["by_method"][method] = {"count": count, "amount": float(amount)}

    # Group by barber (top 10)
    barber_totals = {}
    for payout in payouts:
        if payout.barber_id not in barber_totals:
            barber = db.query(Barber).filter(Barber.id == payout.barber_id).first()
            barber_user = barber.user if barber and hasattr(barber, "user") else None
            barber_name = (
                f"{barber_user.first_name} {barber_user.last_name}"
                if barber_user
                else "Unknown"
            )

            barber_totals[payout.barber_id] = {
                "barber_id": payout.barber_id,
                "barber_name": barber_name,
                "total_amount": 0,
                "payout_count": 0,
            }

        barber_totals[payout.barber_id]["total_amount"] += float(payout.amount)
        barber_totals[payout.barber_id]["payout_count"] += 1

    # Sort by total amount and get top 10
    summary["by_barber"] = sorted(
        barber_totals.values(), key=lambda x: x["total_amount"], reverse=True
    )[:10]

    return summary


# ========== Health Check Endpoint ==========


@router.get("/health", response_model=Dict[str, Any])
async def payout_system_health(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Check the health of the payout system."""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    health = {"status": "healthy", "checks": {}, "statistics": {}}

    # Check for failed payouts
    failed_count = (
        db.query(ScheduledPayout)
        .filter(
            ScheduledPayout.status == PayoutStatus.FAILED,
            ScheduledPayout.retry_count >= ScheduledPayout.max_retries,
        )
        .count()
    )

    health["checks"]["failed_payouts"] = {
        "status": "warning" if failed_count > 0 else "ok",
        "count": failed_count,
    }

    # Check for overdue payouts
    overdue_count = (
        db.query(ScheduledPayout)
        .filter(
            ScheduledPayout.status == PayoutStatus.PENDING,
            ScheduledPayout.scheduled_date < datetime.utcnow() - timedelta(days=3),
        )
        .count()
    )

    health["checks"]["overdue_payouts"] = {
        "status": "warning" if overdue_count > 0 else "ok",
        "count": overdue_count,
    }

    # Check active schedules
    active_schedules = (
        db.query(PayoutSchedule).filter(PayoutSchedule.is_active == True).count()
    )

    health["statistics"]["active_schedules"] = active_schedules

    # Recent payout statistics
    today = datetime.utcnow().date()
    health["statistics"]["payouts_today"] = (
        db.query(ScheduledPayout)
        .filter(func.date(ScheduledPayout.scheduled_date) == today)
        .count()
    )

    health["statistics"]["pending_amount"] = float(
        db.query(func.sum(ScheduledPayout.amount))
        .filter(ScheduledPayout.status == PayoutStatus.PENDING)
        .scalar()
        or 0
    )

    # Update overall status
    if (
        health["checks"]["failed_payouts"]["status"] == "warning"
        or health["checks"]["overdue_payouts"]["status"] == "warning"
    ):
        health["status"] = "degraded"

    return health


# Register router
def include_router(app):
    """Include the payout schedules router in the main app."""
    app.include_router(
        router, prefix="/api/v1/payout-schedules", tags=["payout-schedules"]
    )
