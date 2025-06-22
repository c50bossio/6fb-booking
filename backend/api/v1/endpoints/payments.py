"""Payment API endpoints for Stripe integration."""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator

from config.database import get_db
from models.user import User
from models.payment import (
    Payment,
    PaymentMethod,
    PaymentStatus,
    PaymentMethodType,
    Refund,
    RefundStatus,
    PaymentReport,
)
from models.appointment import Appointment
from services.stripe_service import StripeService
from api.v1.auth import get_current_user

router = APIRouter()


# Pydantic schemas for request/response
class PaymentMethodCreate(BaseModel):
    """Schema for creating a payment method."""

    payment_method_id: str = Field(
        ..., description="Stripe payment method ID from frontend"
    )
    set_as_default: bool = Field(False, description="Set as default payment method")


class PaymentMethodResponse(BaseModel):
    """Schema for payment method response."""

    id: int
    type: PaymentMethodType
    last_four: Optional[str]
    brand: Optional[str]
    exp_month: Optional[int]
    exp_year: Optional[int]
    bank_name: Optional[str]
    account_last_four: Optional[str]
    is_default: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentIntentCreate(BaseModel):
    """Schema for creating a payment intent."""

    appointment_id: int
    amount: int = Field(..., gt=0, description="Amount in cents")
    payment_method_id: Optional[int] = Field(
        None, description="ID of saved payment method"
    )
    save_payment_method: bool = Field(
        False, description="Save payment method for future use"
    )
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class PaymentIntentResponse(BaseModel):
    """Schema for payment intent response."""

    payment_id: int
    client_secret: str
    amount: int
    status: PaymentStatus
    requires_action: bool


class PaymentConfirm(BaseModel):
    """Schema for confirming a payment."""

    payment_intent_id: str
    payment_method_id: Optional[str] = Field(
        None, description="Payment method ID if not already attached"
    )


class RefundCreate(BaseModel):
    """Schema for creating a refund."""

    payment_id: int
    amount: Optional[int] = Field(
        None, gt=0, description="Amount to refund in cents (None for full refund)"
    )
    reason: Optional[str] = Field(None, max_length=255)


class RefundResponse(BaseModel):
    """Schema for refund response."""

    id: int
    payment_id: int
    amount: int
    reason: Optional[str]
    status: RefundStatus
    created_at: datetime
    refunded_at: Optional[datetime]

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    """Schema for payment response."""

    id: int
    appointment_id: int
    amount: int
    amount_decimal: float
    currency: str
    status: PaymentStatus
    description: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
    refunded_amount: int
    refundable_amount: int

    class Config:
        from_attributes = True


class PaymentHistoryQuery(BaseModel):
    """Schema for payment history query parameters."""

    status: Optional[PaymentStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)


class PaymentReportCreate(BaseModel):
    """Schema for creating a payment report."""

    report_type: str = Field(..., pattern="^(daily|weekly|monthly|custom)$")
    start_date: date
    end_date: date

    @validator("end_date")
    def validate_dates(cls, v, values):
        if "start_date" in values and v < values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class PaymentReportResponse(BaseModel):
    """Schema for payment report response."""

    id: int
    report_type: str
    start_date: datetime
    end_date: datetime
    total_revenue: int
    total_refunds: int
    net_revenue: int
    transaction_count: int
    refund_count: int
    breakdown_by_barber: Dict[str, Any]
    breakdown_by_service: Dict[str, Any]
    breakdown_by_payment_method: Dict[str, Any]
    file_path: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Payment Method Endpoints
@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    payment_method: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new payment method for the current user."""
    try:
        stripe_service = StripeService(db)
        pm = await stripe_service.add_payment_method(
            user=current_user,
            payment_method_id=payment_method.payment_method_id,
            set_as_default=payment_method.set_as_default,
        )
        return pm
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    active_only: bool = Query(True, description="Only return active payment methods"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all payment methods for the current user."""
    stripe_service = StripeService(db)
    payment_methods = await stripe_service.get_payment_methods(
        user=current_user, active_only=active_only
    )
    return payment_methods


@router.put("/payment-methods/{payment_method_id}/default")
async def set_default_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set a payment method as default."""
    payment_method = (
        db.query(PaymentMethod)
        .filter(
            PaymentMethod.id == payment_method_id,
            PaymentMethod.user_id == current_user.id,
            PaymentMethod.is_active == True,
        )
        .first()
    )

    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found"
        )

    # Update default status
    db.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user.id, PaymentMethod.is_default == True
    ).update({"is_default": False})

    payment_method.is_default = True
    db.commit()

    return {"message": "Default payment method updated"}


@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(
    payment_method_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a payment method."""
    try:
        stripe_service = StripeService(db)
        await stripe_service.remove_payment_method(
            user=current_user, payment_method_id=payment_method_id
        )
        return {"message": "Payment method removed"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Payment Intent Endpoints
@router.post("/payment-intents", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payment_intent: PaymentIntentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a payment intent for an appointment."""
    # Verify appointment exists and belongs to user
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == payment_intent.appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # CRITICAL SECURITY FIX: Verify user owns the appointment
    if appointment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to pay for this appointment",
        )

    # Check if appointment already has a successful payment
    existing_payment = (
        db.query(Payment)
        .filter(
            Payment.appointment_id == appointment.id,
            Payment.status == PaymentStatus.SUCCEEDED,
        )
        .first()
    )

    if existing_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment already paid"
        )

    # SECURITY FIX: Validate payment amount matches appointment cost
    expected_amount = appointment.total_cost or 0
    if payment_intent.amount != expected_amount:
        logger.warning(
            f"Payment amount mismatch for user {current_user.id}, appointment {appointment.id}: "
            f"requested={payment_intent.amount}, expected={expected_amount}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount must be ${expected_amount/100:.2f}",
        )

    # Additional validation: Ensure amount is positive and reasonable
    if payment_intent.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero",
        )

    if payment_intent.amount > 100000:  # $1000 maximum
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount exceeds maximum allowed",
        )

    try:
        stripe_service = StripeService(db)
        payment, client_secret = await stripe_service.create_payment_intent(
            appointment=appointment,
            user=current_user,
            amount=payment_intent.amount,
            payment_method_id=payment_intent.payment_method_id,
            metadata=payment_intent.metadata,
        )

        return PaymentIntentResponse(
            payment_id=payment.id,
            client_secret=client_secret,
            amount=payment.amount,
            status=payment.status,
            requires_action=payment.status == PaymentStatus.REQUIRES_ACTION,
        )
    except Exception as e:
        # Log the actual error for debugging (but don't expose to user)
        import logging

        logger = logging.getLogger(__name__)
        logger.error(
            f"Payment intent creation failed for user {current_user.id}: {str(e)}"
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create payment intent. Please try again.",
        )


@router.post("/payments/confirm", response_model=PaymentResponse)
async def confirm_payment(
    confirm: PaymentConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm a payment intent."""
    try:
        stripe_service = StripeService(db)
        payment = await stripe_service.confirm_payment(
            payment_intent_id=confirm.payment_intent_id,
            payment_method_id=confirm.payment_method_id,
        )

        # Verify payment belongs to user
        if payment.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to confirm this payment",
            )

        return payment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/payments/{payment_id}/cancel", response_model=PaymentResponse)
async def cancel_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a payment intent."""
    # Verify payment exists and belongs to user
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.user_id == current_user.id)
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )

    if payment.status not in [PaymentStatus.PENDING, PaymentStatus.REQUIRES_ACTION]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel payment in current status",
        )

    try:
        stripe_service = StripeService(db)
        payment = await stripe_service.cancel_payment(payment_id)
        return payment
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Refund Endpoints
@router.post("/refunds", response_model=RefundResponse)
async def create_refund(
    refund: RefundCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a refund for a payment. Requires admin or mentor role."""
    # Check permissions
    if current_user.role not in ["super_admin", "admin", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create refunds",
        )

    try:
        stripe_service = StripeService(db)
        refund_obj = await stripe_service.create_refund(
            payment_id=refund.payment_id,
            amount=refund.amount,
            reason=refund.reason,
            initiated_by=current_user,
        )
        return refund_obj
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/refunds/{refund_id}", response_model=RefundResponse)
async def get_refund(
    refund_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get refund details."""
    refund = db.query(Refund).filter(Refund.id == refund_id).first()

    if not refund:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Refund not found"
        )

    # Check permissions
    payment = refund.payment
    if current_user.id != payment.user_id and current_user.role not in [
        "super_admin",
        "admin",
        "mentor",
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this refund",
        )

    return refund


# Payment History and Reporting
@router.get("/payments", response_model=List[PaymentResponse])
async def get_payment_history(
    query: PaymentHistoryQuery = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment history for the current user."""
    stripe_service = StripeService(db)

    # Build query
    payments_query = db.query(Payment).filter(Payment.user_id == current_user.id)

    if query.status:
        payments_query = payments_query.filter(Payment.status == query.status)

    if query.start_date:
        payments_query = payments_query.filter(Payment.created_at >= query.start_date)

    if query.end_date:
        end_datetime = datetime.combine(query.end_date, datetime.max.time())
        payments_query = payments_query.filter(Payment.created_at <= end_datetime)

    payments = (
        payments_query.order_by(Payment.created_at.desc())
        .limit(query.limit)
        .offset(query.offset)
        .all()
    )

    return payments


@router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment details."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )

    # Check permissions
    if current_user.id != payment.user_id and current_user.role not in [
        "super_admin",
        "admin",
        "mentor",
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this payment",
        )

    return payment


@router.post("/reports", response_model=PaymentReportResponse)
async def create_payment_report(
    report: PaymentReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a payment report. Requires admin or mentor role."""
    # Check permissions
    if current_user.role not in ["super_admin", "admin", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create reports",
        )

    # Calculate report data
    start_datetime = datetime.combine(report.start_date, datetime.min.time())
    end_datetime = datetime.combine(report.end_date, datetime.max.time())

    # Get payments in date range
    payments = (
        db.query(Payment)
        .filter(
            Payment.created_at >= start_datetime,
            Payment.created_at <= end_datetime,
            Payment.status == PaymentStatus.SUCCEEDED,
        )
        .all()
    )

    # Get refunds in date range
    refunds = (
        db.query(Refund)
        .filter(
            Refund.created_at >= start_datetime,
            Refund.created_at <= end_datetime,
            Refund.status == RefundStatus.SUCCEEDED,
        )
        .all()
    )

    # Calculate totals
    total_revenue = sum(p.amount for p in payments)
    total_refunds = sum(r.amount for r in refunds)
    net_revenue = total_revenue - total_refunds

    # Calculate breakdowns
    breakdown_by_barber = {}
    breakdown_by_service = {}
    breakdown_by_payment_method = {}

    for payment in payments:
        # By barber
        barber_name = (
            payment.appointment.barber.full_name if payment.appointment else "Unknown"
        )
        if barber_name not in breakdown_by_barber:
            breakdown_by_barber[barber_name] = {"revenue": 0, "count": 0}
        breakdown_by_barber[barber_name]["revenue"] += payment.amount
        breakdown_by_barber[barber_name]["count"] += 1

        # By service
        service_name = (
            payment.appointment.service_name if payment.appointment else "Unknown"
        )
        if service_name not in breakdown_by_service:
            breakdown_by_service[service_name] = {"revenue": 0, "count": 0}
        breakdown_by_service[service_name]["revenue"] += payment.amount
        breakdown_by_service[service_name]["count"] += 1

        # By payment method
        pm_type = payment.payment_method.type if payment.payment_method else "Unknown"
        if pm_type not in breakdown_by_payment_method:
            breakdown_by_payment_method[pm_type] = {"revenue": 0, "count": 0}
        breakdown_by_payment_method[pm_type]["revenue"] += payment.amount
        breakdown_by_payment_method[pm_type]["count"] += 1

    # Create report record
    payment_report = PaymentReport(
        report_type=report.report_type,
        start_date=start_datetime,
        end_date=end_datetime,
        total_revenue=total_revenue,
        total_refunds=total_refunds,
        net_revenue=net_revenue,
        transaction_count=len(payments),
        refund_count=len(refunds),
        breakdown_by_barber=breakdown_by_barber,
        breakdown_by_service=breakdown_by_service,
        breakdown_by_payment_method=breakdown_by_payment_method,
        generated_by_id=current_user.id,
    )

    db.add(payment_report)
    db.commit()
    db.refresh(payment_report)

    return payment_report


@router.get("/reports", response_model=List[PaymentReportResponse])
async def get_payment_reports(
    report_type: Optional[str] = Query(None, pattern="^(daily|weekly|monthly|custom)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment reports. Requires admin or mentor role."""
    # Check permissions
    if current_user.role not in ["super_admin", "admin", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view reports",
        )

    query = db.query(PaymentReport)

    if report_type:
        query = query.filter(PaymentReport.report_type == report_type)

    reports = (
        query.order_by(PaymentReport.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return reports
