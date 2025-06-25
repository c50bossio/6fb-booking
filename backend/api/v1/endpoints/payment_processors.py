"""
Payment Processor Management API Endpoints
Allows barbers to manage and compare payment processors
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from config.database import get_db
from api.v1.auth import get_current_user
from utils.auth_decorators import require_role
from models.user import User
from models.barber import Barber
from models.payment_processor_preference import PaymentProcessor
from services.payment_processor_service import payment_processor_service

router = APIRouter(prefix="/payment-processors", tags=["payment-processors"])


@router.get("/preference")
async def get_processor_preference(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get barber's payment processor preferences"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    preference = payment_processor_service.get_or_create_preference(db, barber.id)

    return {
        "primary_processor": preference.primary_processor.value,
        "stripe_enabled": preference.stripe_enabled,
        "square_enabled": preference.square_enabled,
        "auto_switch_enabled": preference.auto_switch_enabled,
        "unified_analytics": preference.unified_analytics,
        "comparison_view": preference.comparison_view,
        "fee_alert_threshold": preference.fee_alert_threshold,
        "processor_issue_alerts": preference.processor_issue_alerts,
        "stripe_settings": preference.stripe_settings,
        "square_settings": preference.square_settings,
    }


@router.put("/preference")
async def update_processor_preference(
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update barber's payment processor preferences"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Convert primary_processor string to enum if provided
    if "primary_processor" in updates:
        try:
            updates["primary_processor"] = PaymentProcessor(
                updates["primary_processor"]
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payment processor")

    preference = payment_processor_service.update_preference(db, barber.id, updates)

    return {
        "success": True,
        "message": "Preferences updated successfully",
        "primary_processor": preference.primary_processor.value,
    }


@router.get("/comparison")
async def compare_processors(
    timeframe_days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compare performance and fees between payment processors"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    comparison = payment_processor_service.compare_processors(
        db, barber.id, timeframe_days
    )

    return comparison


@router.get("/fees/calculate")
async def calculate_fees(
    amount: float = Query(..., gt=0),
    processor: str = Query(...),
    instant_payout: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    """Calculate fees for a specific amount and processor"""

    # Validate processor
    try:
        processor_enum = PaymentProcessor(processor)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payment processor")

    if processor_enum == PaymentProcessor.BOTH:
        # Calculate for both processors
        stripe_fees = payment_processor_service.calculate_processor_fees(
            amount, PaymentProcessor.STRIPE, instant_payout
        )
        square_fees = payment_processor_service.calculate_processor_fees(
            amount, PaymentProcessor.SQUARE, instant_payout
        )

        return {
            "amount": amount,
            "instant_payout": instant_payout,
            "stripe": stripe_fees,
            "square": square_fees,
            "savings": {
                "processor": (
                    "square"
                    if square_fees["total_fee"] < stripe_fees["total_fee"]
                    else "stripe"
                ),
                "amount": abs(stripe_fees["total_fee"] - square_fees["total_fee"]),
            },
        }
    else:
        fees = payment_processor_service.calculate_processor_fees(
            amount, processor_enum, instant_payout
        )

        return {
            "amount": amount,
            "processor": processor,
            "instant_payout": instant_payout,
            **fees,
        }


@router.get("/analytics/unified")
async def get_unified_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get unified analytics across all payment processors"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Default date range (last 30 days)
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    analytics = payment_processor_service.get_unified_analytics(
        db, barber.id, start_date, end_date
    )

    return analytics


@router.post("/switch")
async def switch_primary_processor(
    data: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Switch primary payment processor"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Validate processor
    try:
        new_processor = PaymentProcessor(data.get("processor"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid payment processor")

    success, message = payment_processor_service.switch_primary_processor(
        db, barber.id, new_processor
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message, "new_processor": new_processor.value}


@router.get("/health")
async def get_processor_health(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get health status of connected payment processors"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    health_status = payment_processor_service.get_processor_health(db, barber.id)

    return health_status


@router.get("/recommendation")
async def get_processor_recommendation(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get personalized processor recommendation based on usage patterns"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Get comparison data for recommendation
    comparison = payment_processor_service.compare_processors(db, barber.id, 30)

    return {
        "recommendation": comparison["recommendation"],
        "current_usage": {
            "stripe": comparison["stripe"],
            "square": comparison["square"],
        },
    }


@router.get("/performance-metrics")
async def get_performance_metrics(
    processor: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed performance metrics for payment processors"""

    # Get barber
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber profile not found")

    # Get metrics from database
    from models.payment_processor_preference import ProcessorMetrics

    query = (
        db.query(ProcessorMetrics)
        .join(ProcessorMetrics.preference)
        .filter(ProcessorMetrics.preference.has(barber_id=barber.id))
    )

    if processor:
        try:
            processor_enum = PaymentProcessor(processor)
            query = query.filter(ProcessorMetrics.processor == processor_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payment processor")

    metrics = query.all()

    result = {}
    for metric in metrics:
        result[metric.processor.value] = {
            "total_transactions": metric.total_transactions,
            "total_volume": metric.total_volume,
            "total_fees": metric.total_fees,
            "average_processing_time": metric.average_processing_time,
            "success_rate": metric.success_rate,
            "failed_transactions": metric.failed_transactions,
            "disputed_transactions": metric.disputed_transactions,
            "total_payouts": metric.total_payouts,
            "average_payout_time": metric.average_payout_time,
            "instant_payout_count": metric.instant_payout_count,
            "instant_payout_fees": metric.instant_payout_fees,
        }

    return result
