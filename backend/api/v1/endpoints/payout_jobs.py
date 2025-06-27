"""
Payout Jobs Management API
Provides endpoints for monitoring and managing background payout jobs
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from celery.result import AsyncResult
from celery import states

from config.database import get_db
from config.celery_config import celery_app
from models.barber_payment import BarberPayment, PayoutStatus
from models.payout_schedule import PayoutSchedule
from services.auth_service import get_current_user, require_admin
from models.user import User
from tasks.payout_jobs import (
    process_single_payout,
    retry_failed_payout,
    process_daily_payouts,
)
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/status", response_model=Dict[str, Any])
async def get_job_system_status(
    current_user: User = Depends(require_admin),
):
    """
    Get overall status of the payout job system
    """
    try:
        # Get Celery stats
        inspect = celery_app.control.inspect()

        # Get worker stats
        stats = inspect.stats()
        active_workers = len(stats) if stats else 0

        # Get active tasks
        active = inspect.active()
        active_tasks = sum(len(tasks) for tasks in active.values()) if active else 0

        # Get scheduled tasks
        scheduled = inspect.scheduled()
        scheduled_tasks = (
            sum(len(tasks) for tasks in scheduled.values()) if scheduled else 0
        )

        # Get reserved tasks
        reserved = inspect.reserved()
        reserved_tasks = (
            sum(len(tasks) for tasks in reserved.values()) if reserved else 0
        )

        # Get registered tasks
        registered = inspect.registered()
        registered_tasks = []
        if registered:
            for worker, tasks in registered.items():
                registered_tasks.extend(tasks)
        registered_tasks = list(set(registered_tasks))

        # Get queue lengths from Redis
        queue_lengths = {}
        for queue_name in ["default", "payouts", "high_priority", "low_priority"]:
            try:
                queue_length = celery_app.backend.client.llen(f"celery:{queue_name}")
                queue_lengths[queue_name] = queue_length
            except:
                queue_lengths[queue_name] = 0

        return {
            "status": "healthy" if active_workers > 0 else "unhealthy",
            "workers": {
                "active": active_workers,
                "stats": stats,
            },
            "tasks": {
                "active": active_tasks,
                "scheduled": scheduled_tasks,
                "reserved": reserved_tasks,
                "registered": len(registered_tasks),
            },
            "queues": queue_lengths,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting job system status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs", response_model=List[Dict[str, Any]])
async def get_recent_jobs(
    limit: int = Query(default=50, le=100),
    status: Optional[str] = Query(default=None),
    queue: Optional[str] = Query(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get recent payout jobs with their status
    """
    try:
        # Query recent payments as a proxy for jobs
        query = db.query(BarberPayment)

        if status:
            if status == "pending":
                query = query.filter(BarberPayment.status == PayoutStatus.PENDING)
            elif status == "completed":
                query = query.filter(BarberPayment.status == PayoutStatus.COMPLETED)
            elif status == "failed":
                query = query.filter(BarberPayment.status == PayoutStatus.FAILED)

        recent_payments = (
            query.order_by(BarberPayment.created_at.desc()).limit(limit).all()
        )

        jobs = []
        for payment in recent_payments:
            job_data = {
                "id": payment.id,
                "barber_id": payment.barber_id,
                "amount": payment.amount,
                "status": payment.status.value,
                "payment_method": payment.payment_method,
                "created_at": payment.created_at.isoformat(),
                "completed_at": (
                    payment.completed_date.isoformat()
                    if payment.completed_date
                    else None
                ),
                "transaction_id": payment.transaction_id,
                "error_message": payment.error_message,
                "metadata": payment.metadata,
            }

            # Try to get Celery task status if task_id is in metadata
            if payment.metadata and "task_id" in payment.metadata:
                task_id = payment.metadata["task_id"]
                result = AsyncResult(task_id, app=celery_app)
                job_data["task_status"] = result.status
                job_data["task_id"] = task_id

            jobs.append(job_data)

        return jobs

    except Exception as e:
        logger.error(f"Error getting recent jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=Dict[str, Any])
async def get_job_details(
    job_id: str,
    current_user: User = Depends(require_admin),
):
    """
    Get detailed information about a specific job
    """
    try:
        # Try to get Celery task result
        result = AsyncResult(job_id, app=celery_app)

        job_details = {
            "task_id": job_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
            "traceback": result.traceback if result.failed() else None,
            "info": result.info,
            "ready": result.ready(),
            "successful": result.successful() if result.ready() else None,
            "failed": result.failed() if result.ready() else None,
        }

        # Get task metadata if available
        if hasattr(result, "task_name"):
            job_details["task_name"] = result.task_name

        return job_details

    except Exception as e:
        logger.error(f"Error getting job details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/retry/{payment_id}")
async def retry_payout_job(
    payment_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Manually retry a failed payout job
    """
    try:
        # Get the payment
        payment = db.query(BarberPayment).filter(BarberPayment.id == payment_id).first()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status != PayoutStatus.FAILED:
            raise HTTPException(
                status_code=400, detail="Can only retry failed payments"
            )

        # Queue retry task
        task = retry_failed_payout.apply_async(
            args=[payment_id],
            priority=9,
            queue="payouts",
        )

        # Store task ID in payment metadata
        if not payment.metadata:
            payment.metadata = {}
        payment.metadata["retry_task_id"] = task.id
        payment.metadata["manual_retry"] = True
        payment.metadata["retry_requested_by"] = current_user.id
        payment.metadata["retry_requested_at"] = datetime.utcnow().isoformat()
        db.commit()

        return {
            "message": "Retry job queued successfully",
            "task_id": task.id,
            "payment_id": payment_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying payout job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/process-daily")
async def trigger_daily_processing(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
):
    """
    Manually trigger daily payout processing
    """
    try:
        # Queue the daily processing task
        task = process_daily_payouts.apply_async(
            priority=10,
            queue="payouts",
        )

        return {
            "message": "Daily processing triggered successfully",
            "task_id": task.id,
            "triggered_by": current_user.email,
            "triggered_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error triggering daily processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/cancel/{task_id}")
async def cancel_job(
    task_id: str,
    current_user: User = Depends(require_admin),
):
    """
    Cancel a pending or running job
    """
    try:
        # Revoke the task
        celery_app.control.revoke(task_id, terminate=True)

        # Get task status
        result = AsyncResult(task_id, app=celery_app)

        return {
            "message": "Job cancellation requested",
            "task_id": task_id,
            "current_status": result.status,
            "cancelled_by": current_user.email,
            "cancelled_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=Dict[str, Any])
async def get_job_metrics(
    time_range: str = Query(default="24h", pattern="^(1h|6h|24h|7d|30d)$"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get job processing metrics for monitoring
    """
    try:
        # Parse time range
        time_map = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
        }

        cutoff_time = datetime.utcnow() - time_map[time_range]

        # Get payment metrics
        total_payments = (
            db.query(func.count(BarberPayment.id))
            .filter(BarberPayment.created_at >= cutoff_time)
            .scalar()
        )

        completed_payments = (
            db.query(func.count(BarberPayment.id))
            .filter(
                BarberPayment.created_at >= cutoff_time,
                BarberPayment.status == PayoutStatus.COMPLETED,
            )
            .scalar()
        )

        failed_payments = (
            db.query(func.count(BarberPayment.id))
            .filter(
                BarberPayment.created_at >= cutoff_time,
                BarberPayment.status == PayoutStatus.FAILED,
            )
            .scalar()
        )

        pending_payments = (
            db.query(func.count(BarberPayment.id))
            .filter(
                BarberPayment.created_at >= cutoff_time,
                BarberPayment.status == PayoutStatus.PENDING,
            )
            .scalar()
        )

        # Calculate total amounts
        total_amount = (
            db.query(func.sum(BarberPayment.amount))
            .filter(
                BarberPayment.created_at >= cutoff_time,
                BarberPayment.status == PayoutStatus.COMPLETED,
            )
            .scalar()
            or 0
        )

        # Get average processing time
        avg_processing_time = (
            db.query(
                func.avg(
                    func.extract(
                        "epoch", BarberPayment.completed_date - BarberPayment.created_at
                    )
                )
            )
            .filter(
                BarberPayment.created_at >= cutoff_time,
                BarberPayment.status == PayoutStatus.COMPLETED,
                BarberPayment.completed_date.isnot(None),
            )
            .scalar()
            or 0
        )

        # Get failure reasons
        failure_reasons = (
            db.query(
                BarberPayment.error_message, func.count(BarberPayment.id).label("count")
            )
            .filter(
                BarberPayment.created_at >= cutoff_time,
                BarberPayment.status == PayoutStatus.FAILED,
                BarberPayment.error_message.isnot(None),
            )
            .group_by(BarberPayment.error_message)
            .all()
        )

        return {
            "time_range": time_range,
            "metrics": {
                "total_jobs": total_payments,
                "completed": completed_payments,
                "failed": failed_payments,
                "pending": pending_payments,
                "success_rate": (
                    (completed_payments / total_payments * 100)
                    if total_payments > 0
                    else 0
                ),
                "total_amount_processed": float(total_amount),
                "average_processing_time_seconds": float(avg_processing_time),
            },
            "failure_reasons": [
                {"reason": reason, "count": count} for reason, count in failure_reasons
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error getting job metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedules", response_model=List[Dict[str, Any]])
async def get_payout_schedules(
    active_only: bool = Query(default=True),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get all payout schedules
    """
    try:
        query = db.query(PayoutSchedule)

        if active_only:
            query = query.filter(PayoutSchedule.is_active == True)

        schedules = query.all()

        return [
            {
                "id": schedule.id,
                "barber_id": schedule.barber_id,
                "frequency": schedule.frequency,
                "next_payout_date": schedule.next_payout_date.isoformat(),
                "is_active": schedule.is_active,
                "minimum_payout_amount": float(schedule.minimum_payout_amount),
                "payout_method": schedule.payout_method,
                "hold_days": schedule.hold_days,
                "last_successful_payout": (
                    schedule.last_successful_payout.isoformat()
                    if schedule.last_successful_payout
                    else None
                ),
                "total_payouts_processed": schedule.total_payouts_processed,
                "total_amount_processed": float(schedule.total_amount_processed),
                "processing_status": schedule.processing_status,
                "consecutive_failures": schedule.consecutive_failures,
            }
            for schedule in schedules
        ]

    except Exception as e:
        logger.error(f"Error getting payout schedules: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedules/{schedule_id}/pause")
async def pause_schedule(
    schedule_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Pause a payout schedule
    """
    try:
        schedule = (
            db.query(PayoutSchedule).filter(PayoutSchedule.id == schedule_id).first()
        )

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        schedule.is_active = False
        schedule.metadata = schedule.metadata or {}
        schedule.metadata["paused_by"] = current_user.id
        schedule.metadata["paused_at"] = datetime.utcnow().isoformat()

        db.commit()

        return {
            "message": "Schedule paused successfully",
            "schedule_id": schedule_id,
            "paused_by": current_user.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedules/{schedule_id}/resume")
async def resume_schedule(
    schedule_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Resume a paused payout schedule
    """
    try:
        schedule = (
            db.query(PayoutSchedule).filter(PayoutSchedule.id == schedule_id).first()
        )

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")

        schedule.is_active = True
        schedule.consecutive_failures = 0  # Reset failure counter
        schedule.processing_status = "active"
        schedule.metadata = schedule.metadata or {}
        schedule.metadata["resumed_by"] = current_user.id
        schedule.metadata["resumed_at"] = datetime.utcnow().isoformat()

        db.commit()

        return {
            "message": "Schedule resumed successfully",
            "schedule_id": schedule_id,
            "resumed_by": current_user.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Include router in main API
def include_router(api_router):
    api_router.include_router(
        router,
        prefix="/payout-jobs",
        tags=["Payout Jobs"],
    )
