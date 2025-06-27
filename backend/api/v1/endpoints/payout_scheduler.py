"""
API endpoints for managing payout schedules
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field, validator

from config.database import get_async_db
from models.payout_schedule import (
    PayoutSchedule,
    ScheduledPayout,
    PayoutFrequency,
    PayoutStatus,
)
from models.barber import Barber
from services.payout_scheduler_service import payout_scheduler_service
from api.v1.auth import get_current_user, require_role


router = APIRouter(prefix="/payout-scheduler", tags=["payout-scheduler"])


class PayoutScheduleCreate(BaseModel):
    """Schema for creating a payout schedule"""

    barber_id: int
    frequency: PayoutFrequency
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    custom_interval_days: Optional[int] = Field(None, ge=1, le=365)
    minimum_payout_amount: Decimal = Field(default=Decimal("25.00"), ge=0)
    auto_payout_enabled: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False
    advance_notice_days: int = Field(default=1, ge=0, le=7)
    preferred_payment_method: str = Field(default="stripe")
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


class PayoutScheduleUpdate(BaseModel):
    """Schema for updating a payout schedule"""

    frequency: Optional[PayoutFrequency] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    custom_interval_days: Optional[int] = Field(None, ge=1, le=365)
    minimum_payout_amount: Optional[Decimal] = Field(None, ge=0)
    auto_payout_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    advance_notice_days: Optional[int] = Field(None, ge=0, le=7)
    preferred_payment_method: Optional[str] = None
    backup_payment_method: Optional[str] = None
    is_active: Optional[bool] = None


class PayoutScheduleResponse(BaseModel):
    """Response schema for payout schedule"""

    id: int
    barber_id: int
    frequency: PayoutFrequency
    day_of_week: Optional[int]
    day_of_month: Optional[int]
    custom_interval_days: Optional[int]
    minimum_payout_amount: Decimal
    auto_payout_enabled: bool
    email_notifications: bool
    sms_notifications: bool
    advance_notice_days: int
    preferred_payment_method: str
    backup_payment_method: Optional[str]
    is_active: bool
    last_payout_date: Optional[datetime]
    next_payout_date: Optional[datetime]
    total_payouts_sent: int
    total_amount_paid: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ScheduledPayoutResponse(BaseModel):
    """Response schema for scheduled payout"""

    id: int
    schedule_id: int
    barber_id: int
    payout_type: str
    amount: Decimal
    currency: str
    period_start: datetime
    period_end: datetime
    status: PayoutStatus
    scheduled_date: datetime
    processed_date: Optional[datetime]
    payment_method: str
    platform_payout_id: Optional[str]
    platform_fee: Decimal
    net_amount: Decimal
    failure_reason: Optional[str]
    retry_count: int
    notification_sent: bool
    created_at: datetime

    class Config:
        orm_mode = True


class PayoutAnalyticsResponse(BaseModel):
    """Response schema for payout analytics"""

    period_days: int
    total_payouts: int
    total_amount: float
    status_breakdown: Dict[str, int]
    success_rate: float
    average_amount: float
    average_processing_time_seconds: float
    payment_method_breakdown: Dict[str, int]
    failure_reasons: List[str]


class ManualPayoutRequest(BaseModel):
    """Request schema for manual payout trigger"""

    barber_id: int
    amount: Optional[Decimal] = Field(None, gt=0)
    reason: Optional[str] = None
    bypass_minimum: bool = False


@router.post("/schedules", response_model=PayoutScheduleResponse)
async def create_payout_schedule(
    schedule_data: PayoutScheduleCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Create a new payout schedule for a barber"""
    # Check permissions
    if current_user["role"] not in ["admin", "manager"]:
        if (
            current_user["role"] == "barber"
            and current_user["id"] != schedule_data.barber_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to create schedule for another barber",
            )

    # Check if barber exists
    barber = await db.get(Barber, schedule_data.barber_id)
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")

    # Check if schedule already exists
    existing = await db.execute(
        select(PayoutSchedule).where(
            and_(
                PayoutSchedule.barber_id == schedule_data.barber_id,
                PayoutSchedule.is_active == True,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Active payout schedule already exists for this barber",
        )

    # Create schedule
    settings = schedule_data.dict()
    barber_id = settings.pop("barber_id")
    frequency = settings.pop("frequency")

    try:
        schedule = await payout_scheduler_service.create_payout_schedule(
            barber_id=barber_id, frequency=frequency, settings=settings, db=db
        )

        return PayoutScheduleResponse.from_orm(schedule)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error creating schedule: {str(e)}"
        )


@router.get("/schedules", response_model=List[PayoutScheduleResponse])
async def list_payout_schedules(
    barber_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """List payout schedules"""
    # Build query
    query = select(PayoutSchedule)

    # Filter by barber if not admin
    if current_user["role"] == "barber":
        query = query.where(PayoutSchedule.barber_id == current_user["id"])
    elif barber_id:
        query = query.where(PayoutSchedule.barber_id == barber_id)

    if active_only:
        query = query.where(PayoutSchedule.is_active == True)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    schedules = result.scalars().all()

    return [PayoutScheduleResponse.from_orm(s) for s in schedules]


@router.get("/schedules/{schedule_id}", response_model=PayoutScheduleResponse)
async def get_payout_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get a specific payout schedule"""
    schedule = await db.get(PayoutSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Payout schedule not found")

    # Check permissions
    if current_user["role"] == "barber" and schedule.barber_id != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this schedule"
        )

    return PayoutScheduleResponse.from_orm(schedule)


@router.put("/schedules/{schedule_id}", response_model=PayoutScheduleResponse)
async def update_payout_schedule(
    schedule_id: int,
    update_data: PayoutScheduleUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Update a payout schedule"""
    schedule = await db.get(PayoutSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Payout schedule not found")

    # Check permissions
    if current_user["role"] not in ["admin", "manager"]:
        if (
            current_user["role"] == "barber"
            and schedule.barber_id != current_user["id"]
        ):
            raise HTTPException(
                status_code=403, detail="Not authorized to update this schedule"
            )

    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(schedule, field, value)

    schedule.updated_at = datetime.utcnow()

    # Reschedule job if needed
    if any(
        field in update_dict
        for field in [
            "frequency",
            "day_of_week",
            "day_of_month",
            "custom_interval_days",
            "is_active",
        ]
    ):
        await payout_scheduler_service._schedule_payout_job(schedule)

    await db.commit()
    await db.refresh(schedule)

    return PayoutScheduleResponse.from_orm(schedule)


@router.delete("/schedules/{schedule_id}")
async def delete_payout_schedule(
    schedule_id: int,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    db: AsyncSession = Depends(get_async_db),
):
    """Delete (deactivate) a payout schedule"""
    schedule = await db.get(PayoutSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Payout schedule not found")

    # Soft delete
    schedule.is_active = False
    schedule.updated_at = datetime.utcnow()

    # Remove scheduled job
    job_id = f"payout_schedule_{schedule_id}"
    if payout_scheduler_service.scheduler.get_job(job_id):
        payout_scheduler_service.scheduler.remove_job(job_id)

    await db.commit()

    return {"message": "Payout schedule deactivated successfully"}


@router.get("/payouts", response_model=List[ScheduledPayoutResponse])
async def list_scheduled_payouts(
    barber_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    status: Optional[PayoutStatus] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """List scheduled payouts"""
    query = select(ScheduledPayout)

    # Filter by barber if not admin
    if current_user["role"] == "barber":
        query = query.where(ScheduledPayout.barber_id == current_user["id"])
    elif barber_id:
        query = query.where(ScheduledPayout.barber_id == barber_id)

    if schedule_id:
        query = query.where(ScheduledPayout.schedule_id == schedule_id)

    if status:
        query = query.where(ScheduledPayout.status == status)

    if date_from:
        query = query.where(ScheduledPayout.scheduled_date >= date_from)

    if date_to:
        query = query.where(ScheduledPayout.scheduled_date <= date_to)

    query = (
        query.order_by(ScheduledPayout.scheduled_date.desc()).offset(skip).limit(limit)
    )

    result = await db.execute(query)
    payouts = result.scalars().all()

    return [ScheduledPayoutResponse.from_orm(p) for p in payouts]


@router.get("/payouts/{payout_id}", response_model=ScheduledPayoutResponse)
async def get_scheduled_payout(
    payout_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get a specific scheduled payout"""
    payout = await db.get(ScheduledPayout, payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Scheduled payout not found")

    # Check permissions
    if current_user["role"] == "barber" and payout.barber_id != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this payout"
        )

    return ScheduledPayoutResponse.from_orm(payout)


@router.post("/payouts/manual")
async def trigger_manual_payout(
    request: ManualPayoutRequest,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    db: AsyncSession = Depends(get_async_db),
):
    """Manually trigger a payout for a barber"""
    # Get barber's schedule
    result = await db.execute(
        select(PayoutSchedule).where(
            and_(
                PayoutSchedule.barber_id == request.barber_id,
                PayoutSchedule.is_active == True,
            )
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=404, detail="No active payout schedule found for barber"
        )

    # Process the payout immediately
    try:
        await payout_scheduler_service._process_individual_payout(schedule.id)

        return {
            "message": "Manual payout triggered successfully",
            "schedule_id": schedule.id,
            "barber_id": request.barber_id,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing manual payout: {str(e)}"
        )


@router.post("/payouts/{payout_id}/retry")
async def retry_failed_payout(
    payout_id: int,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    db: AsyncSession = Depends(get_async_db),
):
    """Manually retry a failed payout"""
    payout = await db.get(ScheduledPayout, payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Scheduled payout not found")

    if payout.status != PayoutStatus.FAILED:
        raise HTTPException(
            status_code=400, detail="Only failed payouts can be retried"
        )

    try:
        await payout_scheduler_service._retry_single_payout(payout_id)

        return {"message": "Payout retry initiated", "payout_id": payout_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrying payout: {str(e)}")


@router.get("/analytics", response_model=PayoutAnalyticsResponse)
async def get_payout_analytics(
    barber_id: Optional[int] = Query(None),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get payout analytics"""
    # Check permissions
    if current_user["role"] == "barber":
        barber_id = current_user["id"]

    analytics = await payout_scheduler_service.get_payout_analytics(
        barber_id=barber_id, days=days
    )

    return PayoutAnalyticsResponse(**analytics)


@router.post("/test-notification/{schedule_id}")
async def test_payout_notification(
    schedule_id: int,
    notification_type: str = Query(..., pattern="^(advance|completed|failed)$"),
    current_user: dict = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db),
):
    """Test payout notifications (admin only)"""
    schedule = await db.get(PayoutSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Payout schedule not found")

    # Create a test payout
    test_payout = ScheduledPayout(
        schedule_id=schedule_id,
        barber_id=schedule.barber_id,
        amount=Decimal("100.00"),
        period_start=datetime.utcnow() - timedelta(days=7),
        period_end=datetime.utcnow(),
        status=(
            PayoutStatus.COMPLETED
            if notification_type == "completed"
            else PayoutStatus.PENDING
        ),
        scheduled_date=datetime.utcnow(),
        payment_method=schedule.preferred_payment_method,
        platform_fee=Decimal("2.50"),
        net_amount=Decimal("97.50"),
    )

    # Load barber relationship
    await db.refresh(schedule, ["barber"])

    # Send test notification
    if notification_type == "advance":
        await payout_scheduler_service._send_advance_notification(schedule, test_payout)
    else:
        await payout_scheduler_service._send_payout_notification(
            schedule, test_payout, notification_type
        )

    return {"message": f"Test {notification_type} notification sent successfully"}


@router.get("/health")
async def get_scheduler_health(
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """Get payout scheduler health status"""
    jobs = []
    for job in payout_scheduler_service.scheduler.get_jobs():
        jobs.append(
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": (
                    job.next_run_time.isoformat() if job.next_run_time else None
                ),
                "pending": job.pending,
            }
        )

    return {
        "scheduler_running": payout_scheduler_service.scheduler.running,
        "active_jobs": len(jobs),
        "jobs": jobs,
        "metrics": {
            "total_processed": sum(
                v
                for k, v in payout_scheduler_service.payout_metrics.items()
                if k.startswith("payout_") and not k.endswith("_amount")
            ),
            "success_count": payout_scheduler_service.payout_metrics.get(
                "payout_success", 0
            ),
            "failure_count": payout_scheduler_service.payout_metrics.get(
                "payout_failure", 0
            ),
            "error_counts": dict(payout_scheduler_service.error_counts),
        },
    }
