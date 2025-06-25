"""
Enhanced Payment Processing API
Supports intelligent routing between Stripe and Square
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config.database import get_db
from models.user import User
from models.barber import Barber
from models.appointment import Appointment
from services.enhanced_payment_split_service import (
    enhanced_payment_split_service,
    ProcessorType,
    ProcessingMode,
)
from api.v1.auth import get_current_user
from utils.auth_decorators import require_role


router = APIRouter()


# ===== REQUEST/RESPONSE MODELS =====


class PaymentRequest(BaseModel):
    """Enhanced payment request with processor options"""

    appointment_id: int
    amount: float = Field(..., gt=0, description="Payment amount")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method")
    source_id: Optional[str] = Field(None, description="Square payment nonce")
    customer_id: Optional[str] = None
    description: Optional[str] = None
    preferred_processor: Optional[str] = Field(
        default="auto", description="Preferred processor: stripe, square, or auto"
    )
    processing_mode: Optional[str] = Field(
        default="balanced",
        description="Processing mode: fastest, cheapest, balanced, or failover",
    )
    metadata: Optional[Dict[str, Any]] = None


class PaymentResponse(BaseModel):
    """Enhanced payment response"""

    success: bool
    payment_id: str
    transaction_id: str
    processor_used: str
    amount: float
    barber_amount: float
    shop_fee: float
    processing_fee: float
    net_barber_amount: float
    status: str
    processing_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class ProcessorMetricsResponse(BaseModel):
    """Processor performance metrics"""

    processor: str
    success_rate: float
    avg_processing_time: float
    avg_fee_percentage: float
    availability: bool
    last_failure: Optional[datetime] = None
    failure_count: int
    recommendation: Optional[str] = None


class ReconciliationResponse(BaseModel):
    """Cross-processor reconciliation response"""

    date: str
    stripe: Dict[str, Any]
    square: Dict[str, Any]
    combined: Dict[str, Any]
    discrepancies: Optional[List[Dict[str, Any]]] = None


class OptimizationResponse(BaseModel):
    """Payment routing optimization response"""

    analysis_period: Dict[str, Any]
    processor_statistics: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    optimal_routing_config: Dict[str, Any]


# ===== PAYMENT PROCESSING ENDPOINTS =====


@router.post("/process", response_model=PaymentResponse)
async def process_payment(
    payment_request: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Process payment with intelligent routing

    Features:
    - Automatic processor selection based on performance
    - Fallback to alternate processor on failure
    - Real-time fee calculation and splitting
    - Unified transaction tracking
    """
    try:
        # Get appointment and validate
        appointment = (
            db.query(Appointment)
            .filter(Appointment.id == payment_request.appointment_id)
            .first()
        )

        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        # Get barber and payment model
        barber = appointment.barber
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")

        # Prepare payment data
        payment_data = {
            "amount": payment_request.amount,
            "appointment_id": appointment.id,
            "barber_id": barber.id,
            "customer_id": payment_request.customer_id or appointment.client_id,
            "description": payment_request.description
            or f"Service for appointment #{appointment.id}",
            "service_type": (
                appointment.service.name if appointment.service else "general"
            ),
            "barber_payment_model": {
                "payment_type": barber.payment_type or "commission",
                "service_commission_rate": float(barber.commission_rate or 0.3),
            },
            "metadata": payment_request.metadata or {},
        }

        # Add processor-specific data
        if payment_request.payment_method_id:
            payment_data["payment_method_id"] = payment_request.payment_method_id
            payment_data["barber_stripe_account_id"] = barber.stripe_account_id

        if payment_request.source_id:
            payment_data["source_id"] = payment_request.source_id
            payment_data["location_id"] = barber.square_location_id

        # Determine processor preference
        processor_map = {
            "stripe": ProcessorType.STRIPE,
            "square": ProcessorType.SQUARE,
            "auto": ProcessorType.AUTO,
        }
        preferred_processor = processor_map.get(
            payment_request.preferred_processor.lower(), ProcessorType.AUTO
        )

        # Determine processing mode
        mode_map = {
            "fastest": ProcessingMode.FASTEST,
            "cheapest": ProcessingMode.CHEAPEST,
            "balanced": ProcessingMode.BALANCED,
            "failover": ProcessingMode.FAILOVER,
        }
        processing_mode = mode_map.get(
            payment_request.processing_mode.lower(), ProcessingMode.BALANCED
        )

        # Process payment
        result = await enhanced_payment_split_service.process_payment_with_split(
            db,
            payment_data,
            preferred_processor=preferred_processor,
            processing_mode=processing_mode,
        )

        if not result.success:
            raise HTTPException(
                status_code=400, detail=f"Payment failed: {result.error_message}"
            )

        # Update appointment status
        appointment.payment_status = "paid"
        appointment.payment_processor = result.processor_used.value
        appointment.payment_id = result.payment_id
        db.commit()

        return PaymentResponse(
            success=result.success,
            payment_id=result.payment_id,
            transaction_id=result.transaction_id,
            processor_used=result.processor_used.value,
            amount=float(result.amount),
            barber_amount=float(result.barber_amount),
            shop_fee=float(result.shop_fee),
            processing_fee=float(result.processing_fee),
            net_barber_amount=float(result.barber_amount - result.processing_fee),
            status=result.status,
            processing_time=(
                result.metadata.get("processing_time") if result.metadata else None
            ),
            metadata=result.metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=List[ProcessorMetricsResponse])
async def get_processor_metrics(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get real-time processor performance metrics"""
    try:
        metrics = await enhanced_payment_split_service._get_processor_metrics(db)

        responses = []
        for processor, metric in metrics.items():
            # Add recommendations based on metrics
            recommendation = None
            if metric.success_rate < 0.95:
                recommendation = f"Consider using alternate processor due to low success rate ({metric.success_rate:.1%})"
            elif metric.avg_processing_time > 5.0:
                recommendation = (
                    f"High processing time detected ({metric.avg_processing_time:.1f}s)"
                )

            responses.append(
                ProcessorMetricsResponse(
                    processor=processor.value,
                    success_rate=metric.success_rate,
                    avg_processing_time=metric.avg_processing_time,
                    avg_fee_percentage=metric.avg_fee_percentage,
                    availability=metric.availability,
                    last_failure=metric.last_failure,
                    failure_count=metric.failure_count,
                    recommendation=recommendation,
                )
            )

        return responses

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def get_transaction_history(
    barber_id: Optional[int] = Query(None, description="Filter by barber ID"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    processor: Optional[str] = Query(None, description="Filter by processor"),
    limit: int = Query(100, le=1000, description="Maximum results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get unified transaction history across all processors"""
    try:
        # Convert dates to datetime
        start_datetime = (
            datetime.combine(start_date, datetime.min.time()) if start_date else None
        )
        end_datetime = (
            datetime.combine(end_date, datetime.max.time()) if end_date else None
        )

        # Map processor string to enum
        processor_type = None
        if processor:
            processor_map = {
                "stripe": ProcessorType.STRIPE,
                "square": ProcessorType.SQUARE,
            }
            processor_type = processor_map.get(processor.lower())

        transactions = (
            await enhanced_payment_split_service.get_unified_transaction_history(
                db,
                barber_id=barber_id,
                start_date=start_datetime,
                end_date=end_datetime,
                processor=processor_type,
            )
        )

        # Limit results
        return transactions[:limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconcile", response_model=ReconciliationResponse)
@require_role(["admin", "manager"])
async def reconcile_transactions(
    reconcile_date: date = Body(..., description="Date to reconcile"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reconcile transactions across Stripe and Square

    Admin only - provides detailed financial reconciliation
    """
    try:
        reconciliation = (
            await enhanced_payment_split_service.reconcile_cross_processor_transactions(
                db, date=reconcile_date
            )
        )

        # Check for discrepancies
        discrepancies = []

        # Check if total amounts match expected
        stripe_net = (
            reconciliation["stripe"]["shop_revenue"]
            - reconciliation["stripe"]["processing_fees"]
        )
        square_net = (
            reconciliation["square"]["shop_revenue"]
            - reconciliation["square"]["processing_fees"]
        )

        if abs(reconciliation["stripe"]["net_revenue"] - stripe_net) > 0.01:
            discrepancies.append(
                {
                    "type": "calculation_mismatch",
                    "processor": "stripe",
                    "message": "Net revenue calculation mismatch",
                }
            )

        if abs(reconciliation["square"]["net_revenue"] - square_net) > 0.01:
            discrepancies.append(
                {
                    "type": "calculation_mismatch",
                    "processor": "square",
                    "message": "Net revenue calculation mismatch",
                }
            )

        reconciliation["discrepancies"] = discrepancies if discrepancies else None

        return ReconciliationResponse(**reconciliation)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize", response_model=OptimizationResponse)
@require_role(["admin"])
async def optimize_payment_routing(
    lookback_days: int = Body(30, description="Days of history to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze payment history and optimize routing configuration

    Admin only - provides routing recommendations
    """
    try:
        optimization = await enhanced_payment_split_service.optimize_payment_routing(
            db, lookback_days=lookback_days
        )

        return OptimizationResponse(**optimization)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-routing")
@require_role(["admin"])
async def test_payment_routing(
    amount: float = Body(..., gt=0, description="Test amount"),
    preferred_processor: str = Body("auto", description="Processor preference"),
    processing_mode: str = Body("balanced", description="Processing mode"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Test payment routing logic without processing actual payment

    Admin only - for testing routing decisions
    """
    try:
        # Get current metrics
        metrics = await enhanced_payment_split_service._get_processor_metrics(db)

        # Prepare test payment data
        payment_data = {
            "amount": amount,
            "barber_payment_model": {
                "payment_type": "commission",
                "service_commission_rate": 0.3,
            },
        }

        # Map preferences
        processor_map = {
            "stripe": ProcessorType.STRIPE,
            "square": ProcessorType.SQUARE,
            "auto": ProcessorType.AUTO,
        }
        mode_map = {
            "fastest": ProcessingMode.FASTEST,
            "cheapest": ProcessingMode.CHEAPEST,
            "balanced": ProcessingMode.BALANCED,
            "failover": ProcessingMode.FAILOVER,
        }

        preferred = processor_map.get(preferred_processor.lower(), ProcessorType.AUTO)
        mode = mode_map.get(processing_mode.lower(), ProcessingMode.BALANCED)

        # Determine which processor would be selected
        if preferred == ProcessorType.AUTO:
            selected_processor = await enhanced_payment_split_service._select_processor(
                metrics, mode, payment_data
            )
        else:
            selected_processor = preferred

        # Calculate fees for comparison
        stripe_fee = amount * 0.029 + 0.30
        square_fee = amount * 0.026 + 0.10

        return {
            "test_amount": amount,
            "selected_processor": selected_processor.value,
            "selection_reason": f"Based on {processing_mode} mode",
            "processor_comparison": {
                "stripe": {
                    "available": enhanced_payment_split_service._is_processor_available(
                        metrics.get(ProcessorType.STRIPE)
                    ),
                    "estimated_fee": round(stripe_fee, 2),
                    "metrics": (
                        {
                            "success_rate": metrics[ProcessorType.STRIPE].success_rate,
                            "avg_processing_time": metrics[
                                ProcessorType.STRIPE
                            ].avg_processing_time,
                        }
                        if ProcessorType.STRIPE in metrics
                        else None
                    ),
                },
                "square": {
                    "available": enhanced_payment_split_service._is_processor_available(
                        metrics.get(ProcessorType.SQUARE)
                    ),
                    "estimated_fee": round(square_fee, 2),
                    "metrics": (
                        {
                            "success_rate": metrics[ProcessorType.SQUARE].success_rate,
                            "avg_processing_time": metrics[
                                ProcessorType.SQUARE
                            ].avg_processing_time,
                        }
                        if ProcessorType.SQUARE in metrics
                        else None
                    ),
                },
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/barber/{barber_id}/processor-status")
async def get_barber_processor_status(
    barber_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get barber's payment processor connection status"""
    try:
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")

        # Check permissions
        if (
            current_user.role not in ["admin", "manager"]
            and current_user.id != barber.user_id
        ):
            raise HTTPException(status_code=403, detail="Access denied")

        return {
            "barber_id": barber_id,
            "barber_name": barber.name,
            "stripe": {
                "connected": bool(barber.stripe_account_id),
                "account_id": (
                    barber.stripe_account_id if barber.stripe_account_id else None
                ),
                "payouts_enabled": (
                    barber.stripe_payouts_enabled
                    if hasattr(barber, "stripe_payouts_enabled")
                    else False
                ),
            },
            "square": {
                "connected": (
                    bool(barber.square_account_id)
                    if hasattr(barber, "square_account_id")
                    else False
                ),
                "account_id": (
                    barber.square_account_id
                    if hasattr(barber, "square_account_id")
                    else None
                ),
                "location_id": (
                    barber.square_location_id
                    if hasattr(barber, "square_location_id")
                    else None
                ),
            },
            "preferred_processor": (
                barber.preferred_processor
                if hasattr(barber, "preferred_processor")
                else None
            ),
            "payment_settings": {
                "payment_type": barber.payment_type,
                "commission_rate": (
                    float(barber.commission_rate) if barber.commission_rate else 0.3
                ),
                "instant_payouts": (
                    barber.instant_payouts_enabled
                    if hasattr(barber, "instant_payouts_enabled")
                    else False
                ),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
