"""
Payouts API Endpoints
Aggregates payment data from various sources to provide a unified payout interface
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel, Field

from config.database import get_db
from models.barber import Barber
from models.barber_payment import (
    BarberPaymentModel,
    CommissionPayment,
    PaymentStatus,
    BoothRentPayment,
    ProductSale,
)
from models.payment import Payment
from models.appointment import Appointment
from models.user import User
from api.v1.auth import get_current_user
from services.rbac_service import RBACService, Permission
from services.stripe_connect_service import StripeConnectService

router = APIRouter()


# Pydantic Models
class PayoutResponse(BaseModel):
    id: str
    barber_id: int
    barber_name: str
    amount: float
    fee: float
    net_amount: float
    status: str  # 'pending', 'processing', 'completed', 'failed', 'cancelled'
    payment_method: str  # 'stripe', 'square', 'tremendous', 'manual'
    payout_date: str
    created_at: str
    failure_reason: Optional[str] = None
    transaction_id: Optional[str] = None


class PayoutStats(BaseModel):
    total_pending: int
    total_processing: int
    total_completed: int
    total_failed: int
    total_amount_pending: float
    total_amount_completed: float
    next_payout_date: str


class PayoutsListResponse(BaseModel):
    payouts: List[PayoutResponse]
    stats: PayoutStats


class CreatePayoutRequest(BaseModel):
    barber_id: int
    amount: float
    method: str = "stripe"
    description: Optional[str] = None


@router.get("", response_model=PayoutsListResponse)
async def get_payouts(
    status: Optional[str] = None,
    barber_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all payouts with optional filters"""
    rbac = RBACService(db)

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        # If not admin, only show their own payouts if they're a barber
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            barber_id = barber.id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Build query for commission payments
    query = (
        db.query(CommissionPayment)
        .join(
            BarberPaymentModel,
            CommissionPayment.payment_model_id == BarberPaymentModel.id,
        )
        .join(Barber, BarberPaymentModel.barber_id == Barber.id)
    )

    if barber_id:
        query = query.filter(CommissionPayment.barber_id == barber_id)

    if start_date:
        query = query.filter(CommissionPayment.created_at >= start_date)

    if end_date:
        query = query.filter(CommissionPayment.created_at <= end_date)

    commission_payments = query.all()

    # Convert to payout format
    payouts = []
    for cp in commission_payments:
        barber = db.query(Barber).filter(Barber.id == cp.barber_id).first()
        barber_user = barber.user if barber else None

        # Map payment status to payout status
        payout_status = "pending"
        if cp.status == PaymentStatus.PAID:
            payout_status = "completed"
        elif cp.status == PaymentStatus.OVERDUE:
            payout_status = "failed"
        elif cp.status == PaymentStatus.PARTIAL:
            payout_status = "processing"
        elif cp.status == PaymentStatus.CANCELLED:
            payout_status = "cancelled"

        # Apply status filter if provided
        if status and payout_status != status:
            continue

        # Calculate fee (2.9% for Stripe, example)
        fee = (
            float(cp.total_paid) * 0.029 if cp.payment_method == "stripe_connect" else 0
        )

        payouts.append(
            PayoutResponse(
                id=str(cp.id),
                barber_id=cp.barber_id,
                barber_name=(
                    f"{barber_user.first_name} {barber_user.last_name}"
                    if barber_user
                    else "Unknown"
                ),
                amount=float(cp.total_paid + fee),
                fee=fee,
                net_amount=float(cp.total_paid),
                status=payout_status,
                payment_method=cp.payment_method or "stripe",
                payout_date=(
                    cp.paid_date.isoformat()
                    if cp.paid_date
                    else cp.period_end.isoformat()
                ),
                created_at=cp.created_at.isoformat(),
                failure_reason=cp.notes,
                transaction_id=cp.stripe_transfer_id,
            )
        )

    # Calculate stats
    stats_pending = len([p for p in payouts if p.status == "pending"])
    stats_processing = len([p for p in payouts if p.status == "processing"])
    stats_completed = len([p for p in payouts if p.status == "completed"])
    stats_failed = len([p for p in payouts if p.status == "failed"])

    total_pending_amount = sum(p.net_amount for p in payouts if p.status == "pending")
    total_completed_amount = sum(
        p.net_amount for p in payouts if p.status == "completed"
    )

    # Calculate next payout date (example: next Thursday)
    today = datetime.utcnow()
    days_until_thursday = (3 - today.weekday()) % 7  # Thursday is 3
    if days_until_thursday == 0:
        days_until_thursday = 7
    next_payout = today + timedelta(days=days_until_thursday)

    stats = PayoutStats(
        total_pending=stats_pending,
        total_processing=stats_processing,
        total_completed=stats_completed,
        total_failed=stats_failed,
        total_amount_pending=total_pending_amount,
        total_amount_completed=total_completed_amount,
        next_payout_date=next_payout.isoformat(),
    )

    return PayoutsListResponse(payouts=payouts, stats=stats)


@router.post("/{payout_id}/process")
async def process_payout(
    payout_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process a pending payout"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get the commission payment
    commission_payment = (
        db.query(CommissionPayment)
        .filter(CommissionPayment.id == int(payout_id))
        .first()
    )

    if not commission_payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found"
        )

    if commission_payment.status != PaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout is not in pending status",
        )

    # Get payment model for Stripe account
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(BarberPaymentModel.id == commission_payment.payment_model_id)
        .first()
    )

    if not payment_model or not payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not completed Stripe Connect setup",
        )

    try:
        # Process the payout via Stripe
        stripe_service = StripeConnectService()
        transfer = stripe_service.create_transfer(
            amount=int(commission_payment.total_paid * 100),  # Convert to cents
            destination=payment_model.stripe_connect_account_id,
            description=f"Payout for period {commission_payment.period_start.date()} to {commission_payment.period_end.date()}",
        )

        # Update commission payment
        commission_payment.status = PaymentStatus.PAID
        commission_payment.paid_date = datetime.utcnow()
        commission_payment.stripe_transfer_id = transfer["id"]
        commission_payment.payment_method = "stripe_connect"

        db.commit()

        return {"success": True, "message": "Payout processed successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.post("/{payout_id}/cancel")
async def cancel_payout(
    payout_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending payout"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get the commission payment
    commission_payment = (
        db.query(CommissionPayment)
        .filter(CommissionPayment.id == int(payout_id))
        .first()
    )

    if not commission_payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payout not found"
        )

    if commission_payment.status != PaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending payouts can be cancelled",
        )

    # Update status
    commission_payment.status = PaymentStatus.CANCELLED
    commission_payment.notes = "Cancelled by admin"

    db.commit()

    return {"success": True, "message": "Payout cancelled successfully"}


@router.post("/barbers/payout", response_model=dict)
async def create_manual_payout(
    payout_data: CreatePayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a manual payout for a barber"""
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

    # Get or create payment model
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

    # Verify Stripe Connect if using Stripe
    if payout_data.method == "stripe" and not payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not completed Stripe Connect setup",
        )

    try:
        # Create commission payment record
        commission_payment = CommissionPayment(
            payment_model_id=payment_model.id,
            barber_id=payout_data.barber_id,
            period_start=datetime.utcnow() - timedelta(days=7),
            period_end=datetime.utcnow(),
            service_revenue=0,
            service_commission_rate=0,
            service_commission_amount=0,
            product_revenue=0,
            product_commission_rate=0,
            product_commission_amount=0,
            total_commission=0,
            total_paid=payout_data.amount,
            shop_owner_amount=0,
            barber_amount=payout_data.amount,
            status=PaymentStatus.PENDING,
            payment_method=payout_data.method,
            notes=payout_data.description or "Manual payout",
        )

        db.add(commission_payment)

        # If method is stripe, process immediately
        if payout_data.method == "stripe":
            stripe_service = StripeConnectService()
            transfer = stripe_service.create_transfer(
                amount=int(payout_data.amount * 100),  # Convert to cents
                destination=payment_model.stripe_connect_account_id,
                description=payout_data.description or "Manual payout",
            )

            commission_payment.status = PaymentStatus.PAID
            commission_payment.paid_date = datetime.utcnow()
            commission_payment.stripe_transfer_id = transfer["id"]

        db.commit()
        db.refresh(commission_payment)

        return {
            "success": True,
            "payout_id": commission_payment.id,
            "message": f"Payout of ${payout_data.amount} created successfully",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payout: {str(e)}",
        )


# Include required imports for router registration
def include_router(app):
    app.include_router(router, prefix="/api/v1/payouts", tags=["payouts"])
