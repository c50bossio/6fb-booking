"""
Barber Payment Management with Stripe Connect
Industry standard solution used by Uber, DoorDash, etc.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from config.database import get_db
from models.barber import Barber
from models.barber_payment import (
    BarberPaymentModel,
    ProductSale,
    CommissionPayment,
    PaymentModelType,
    PaymentStatus,
)
from models.appointment import Appointment
from models.payment import Payment
from api.v1.auth import get_current_user
from models.user import User
from services.rbac_service import RBACService, Permission
from services.stripe_connect_service import StripeConnectService


router = APIRouter()


# Pydantic Models
class StripeConnectOnboardingResponse(BaseModel):
    account_id: str
    onboarding_url: str
    expires_at: datetime


class CommissionSummary(BaseModel):
    barber_id: int
    barber_name: str
    period_start: datetime
    period_end: datetime
    service_revenue: float
    service_commission: float
    product_revenue: float
    product_commission: float
    total_commission: float
    shop_owner_portion: float
    barber_portion: float
    stripe_account_id: Optional[str]
    payouts_enabled: bool
    can_receive_payout: bool


class PayoutRequest(BaseModel):
    barber_id: int
    period_start: datetime
    period_end: datetime
    include_services: bool = True
    include_products: bool = True
    instant: bool = False  # Instant payout (1% fee)


# API Endpoints
@router.post("/onboard/{barber_id}", response_model=StripeConnectOnboardingResponse)
async def create_stripe_onboarding(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 1: Create Stripe Connect account and onboarding link for barber
    Barber completes a 5-10 minute form to add bank details
    """
    rbac = RBACService(db)

    # Check permissions - barbers can onboard themselves
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    if barber.user_id != current_user.id:
        if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Check if already has Stripe account
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    stripe_service = StripeConnectService()

    # Create or retrieve Stripe Connect account
    if payment_model and payment_model.stripe_connect_account_id:
        account_id = payment_model.stripe_connect_account_id

        # Check if already onboarded
        status = stripe_service.check_account_status(account_id)
        if status["payouts_enabled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Barber has already completed Stripe onboarding",
            )
    else:
        # Create new Stripe Connect account
        account_data = {
            "email": barber.user.email,
            "first_name": barber.user.first_name,
            "last_name": barber.user.last_name,
            "phone": barber.user.phone,
        }

        account = stripe_service.create_connected_account(account_data)
        account_id = account["account_id"]

        # Create or update payment model
        if not payment_model:
            payment_model = BarberPaymentModel(
                barber_id=barber_id,
                payment_type=PaymentModelType.COMMISSION,
                service_commission_rate=0.30,  # Default 30%
                product_commission_rate=0.15,  # Default 15%
                stripe_connect_account_id=account_id,
                active=True,
            )
            db.add(payment_model)
        else:
            payment_model.stripe_connect_account_id = account_id

        db.commit()

    # Create onboarding link
    base_url = "https://yourdomain.com"  # Replace with your domain
    onboarding_link = stripe_service.create_account_link(
        account_id=account_id,
        return_url=f"{base_url}/barbers/{barber_id}/onboarding/complete",
        refresh_url=f"{base_url}/barbers/{barber_id}/onboarding/refresh",
    )

    return StripeConnectOnboardingResponse(
        account_id=account_id,
        onboarding_url=onboarding_link["url"],
        expires_at=datetime.fromtimestamp(onboarding_link["expires_at"]),
    )


@router.get("/onboarding-status/{barber_id}")
async def check_onboarding_status(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if barber has completed Stripe onboarding"""
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model or not payment_model.stripe_connect_account_id:
        return {"onboarded": False, "message": "No Stripe account created yet"}

    stripe_service = StripeConnectService()
    status = stripe_service.check_account_status(
        payment_model.stripe_connect_account_id
    )

    # Update model if status changed
    if status["payouts_enabled"] != payment_model.stripe_payouts_enabled:
        payment_model.stripe_payouts_enabled = status["payouts_enabled"]
        payment_model.stripe_onboarding_completed = status["details_submitted"]
        db.commit()

    return {
        "onboarded": status["payouts_enabled"],
        "details_submitted": status["details_submitted"],
        "requirements": status["requirements"],
    }


@router.get("/dashboard-link/{barber_id}")
async def get_stripe_dashboard_link(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get link for barber to access their Stripe dashboard"""
    # Check permissions - barbers can access their own dashboard
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    if barber.user_id != current_user.id:
        rbac = RBACService(db)
        if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model or not payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No Stripe account found"
        )

    stripe_service = StripeConnectService()
    login_url = stripe_service.create_login_link(
        payment_model.stripe_connect_account_id
    )

    return {"dashboard_url": login_url}


@router.get("/commissions/summary", response_model=List[CommissionSummary])
async def get_commission_summary(
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get commission summary for barbers with payout eligibility"""
    rbac = RBACService(db)

    # Build query
    query = db.query(BarberPaymentModel).filter(BarberPaymentModel.active == True)

    # If not admin, only show current barber's data
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not a barber account"
            )
        query = query.filter(BarberPaymentModel.barber_id == barber.id)
    elif barber_id:
        query = query.filter(BarberPaymentModel.barber_id == barber_id)

    payment_models = query.all()
    summaries = []

    for model in payment_models:
        # Calculate service commissions
        service_revenue = (
            db.query(func.sum(Payment.amount))
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .filter(
                Appointment.barber_id == model.barber_id,
                Payment.status == "succeeded",
                Payment.created_at >= period_start,
                Payment.created_at <= period_end,
            )
            .scalar()
            or 0
        )

        service_commission = float(service_revenue) * model.service_commission_rate

        # Calculate product commissions
        product_sales = (
            db.query(
                func.sum(ProductSale.total_amount).label("revenue"),
                func.sum(ProductSale.commission_amount).label("commission"),
            )
            .filter(
                ProductSale.barber_id == model.barber_id,
                ProductSale.sale_date >= period_start,
                ProductSale.sale_date <= period_end,
            )
            .first()
        )

        product_revenue = product_sales.revenue or 0
        product_commission = product_sales.commission or 0

        total_commission = service_commission + product_commission

        # Calculate split
        if model.payment_type == PaymentModelType.COMMISSION:
            shop_owner_portion = total_commission
            barber_portion = float(service_revenue + product_revenue) - total_commission
        else:
            shop_owner_portion = 0
            barber_portion = 0

        barber = db.query(Barber).filter(Barber.id == model.barber_id).first()

        summaries.append(
            CommissionSummary(
                barber_id=model.barber_id,
                barber_name=f"{barber.user.first_name} {barber.user.last_name}",
                period_start=period_start,
                period_end=period_end,
                service_revenue=float(service_revenue),
                service_commission=service_commission,
                product_revenue=float(product_revenue),
                product_commission=float(product_commission),
                total_commission=total_commission,
                shop_owner_portion=shop_owner_portion,
                barber_portion=barber_portion,
                stripe_account_id=model.stripe_connect_account_id,
                payouts_enabled=model.stripe_payouts_enabled or False,
                can_receive_payout=(
                    model.stripe_payouts_enabled and barber_portion > 0
                ),
            )
        )

    return summaries


@router.post("/payouts/process", response_model=dict)
async def process_payout(
    payout_request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process commission payout using Stripe Connect
    Standard: 0.25% + $0.25 (1-2 days)
    Instant: +1% fee (arrives in 30 minutes)
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == payout_request.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active payment model found",
        )

    if not payment_model.stripe_payouts_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not completed Stripe onboarding",
        )

    # Calculate amounts
    service_revenue = 0
    if payout_request.include_services:
        service_revenue = (
            db.query(func.sum(Payment.amount))
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .filter(
                Appointment.barber_id == payout_request.barber_id,
                Payment.status == "succeeded",
                Payment.created_at >= payout_request.period_start,
                Payment.created_at <= payout_request.period_end,
            )
            .scalar()
            or 0
        )

    product_revenue = 0
    if payout_request.include_products:
        product_revenue = (
            db.query(func.sum(ProductSale.total_amount))
            .filter(
                ProductSale.barber_id == payout_request.barber_id,
                ProductSale.sale_date >= payout_request.period_start,
                ProductSale.sale_date <= payout_request.period_end,
                ProductSale.commission_paid == False,
            )
            .scalar()
            or 0
        )

    total_revenue = float(service_revenue + product_revenue)

    if total_revenue <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No revenue to process for this period",
        )

    # Calculate split
    if payment_model.payment_type == PaymentModelType.COMMISSION:
        service_commission = (
            float(service_revenue) * payment_model.service_commission_rate
        )
        product_commission = (
            float(product_revenue) * payment_model.product_commission_rate
        )

        shop_owner_amount = service_commission + product_commission
        barber_amount = total_revenue - shop_owner_amount
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payout not implemented for {payment_model.payment_type} payment type",
        )

    # Process Stripe payout
    stripe_service = StripeConnectService()

    try:
        # Create metadata
        metadata = {
            "barber_id": str(payout_request.barber_id),
            "period_start": payout_request.period_start.isoformat(),
            "period_end": payout_request.period_end.isoformat(),
            "type": "commission_payout",
        }

        # Transfer funds to connected account
        transfer = stripe_service.create_transfer(
            account_id=payment_model.stripe_connect_account_id,
            amount=Decimal(str(barber_amount)),
            metadata=metadata,
        )

        # Create payout (standard or instant)
        if payout_request.instant and payment_model.enable_instant_payouts:
            payout = stripe_service.create_instant_payout(
                account_id=payment_model.stripe_connect_account_id,
                amount=Decimal(str(barber_amount)),
                metadata=metadata,
            )
            payout_method = "instant"
            fee = payout.get("fee", 0)
        else:
            payout = stripe_service.create_payout(
                account_id=payment_model.stripe_connect_account_id,
                amount=Decimal(str(barber_amount)),
                metadata=metadata,
            )
            payout_method = "standard"
            # Calculate Stripe fee: 0.25% + $0.25
            fee = (barber_amount * 0.0025) + 0.25

        # Create commission payment record
        commission_payment = CommissionPayment(
            payment_model_id=payment_model.id,
            barber_id=payout_request.barber_id,
            period_start=payout_request.period_start,
            period_end=payout_request.period_end,
            service_revenue=float(service_revenue),
            service_commission_rate=payment_model.service_commission_rate,
            service_commission_amount=(
                service_commission if payout_request.include_services else 0
            ),
            product_revenue=float(product_revenue),
            product_commission_rate=payment_model.product_commission_rate,
            product_commission_amount=(
                product_commission if payout_request.include_products else 0
            ),
            total_commission=shop_owner_amount,
            total_paid=barber_amount,
            shop_owner_amount=shop_owner_amount,
            barber_amount=barber_amount,
            status=PaymentStatus.PENDING,
            payment_method=f"stripe_{payout_method}",
            stripe_transfer_id=transfer["transfer_id"],
            stripe_payout_id=payout.get("payout_id"),
            payout_status=payout.get("status", "pending"),
            payout_arrival_date=payout.get("arrival_date"),
        )

        db.add(commission_payment)

        # Mark product sales as paid
        if payout_request.include_products:
            db.query(ProductSale).filter(
                ProductSale.barber_id == payout_request.barber_id,
                ProductSale.sale_date >= payout_request.period_start,
                ProductSale.sale_date <= payout_request.period_end,
                ProductSale.commission_paid == False,
            ).update({"commission_paid": True})

        db.commit()

        return {
            "success": True,
            "transfer_id": transfer["transfer_id"],
            "payout_id": payout.get("payout_id"),
            "barber_amount": barber_amount,
            "shop_owner_amount": shop_owner_amount,
            "total_revenue": total_revenue,
            "fee": fee,
            "arrival_date": str(payout.get("arrival_date", "Processing")),
            "method": payout_method,
            "message": f"Payout of ${barber_amount:.2f} sent via Stripe ({payout_method})",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.post("/payouts/batch", response_model=dict)
async def process_batch_payouts(
    period_start: datetime,
    period_end: datetime,
    instant: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process payouts for all eligible barbers"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get all barbers with Stripe accounts
    payment_models = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.active == True,
            BarberPaymentModel.stripe_payouts_enabled == True,
            BarberPaymentModel.payment_type == PaymentModelType.COMMISSION,
        )
        .all()
    )

    successful_payouts = []
    failed_payouts = []
    total_paid = Decimal("0")

    for model in payment_models:
        try:
            # Process individual payout
            payout_request = PayoutRequest(
                barber_id=model.barber_id,
                period_start=period_start,
                period_end=period_end,
                instant=instant,
            )

            result = await process_payout(payout_request, current_user, db)

            successful_payouts.append(
                {
                    "barber_id": model.barber_id,
                    "amount": result["barber_amount"],
                    "transfer_id": result["transfer_id"],
                }
            )

            total_paid += Decimal(str(result["barber_amount"]))

        except Exception as e:
            failed_payouts.append({"barber_id": model.barber_id, "error": str(e)})

    return {
        "success": True,
        "processed": len(successful_payouts),
        "failed": len(failed_payouts),
        "total_paid": float(total_paid),
        "successful_payouts": successful_payouts,
        "failed_payouts": failed_payouts,
    }


@router.post("/webhook/stripe-connect", include_in_schema=False)
async def handle_stripe_connect_webhook(
    request: Request, db: Session = Depends(get_db)
):
    """Handle Stripe Connect webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    stripe_service = StripeConnectService()
    webhook_secret = os.getenv("STRIPE_CONNECT_WEBHOOK_SECRET")

    try:
        event_data = stripe_service.handle_webhook(
            payload.decode("utf-8"), sig_header, webhook_secret
        )

        # Handle account updates
        if event_data["type"] == "account_updated":
            payment_model = (
                db.query(BarberPaymentModel)
                .filter(
                    BarberPaymentModel.stripe_connect_account_id
                    == event_data["account_id"]
                )
                .first()
            )

            if payment_model:
                payment_model.stripe_payouts_enabled = event_data["payouts_enabled"]
                payment_model.stripe_onboarding_completed = event_data[
                    "details_submitted"
                ]
                db.commit()

        # Handle payout status updates
        elif event_data["type"] == "payout_paid":
            commission_payment = (
                db.query(CommissionPayment)
                .filter(CommissionPayment.stripe_payout_id == event_data["payout_id"])
                .first()
            )

            if commission_payment:
                commission_payment.status = PaymentStatus.PAID
                commission_payment.paid_date = datetime.utcnow()
                commission_payment.payout_status = "paid"
                db.commit()

        elif event_data["type"] == "payout_failed":
            commission_payment = (
                db.query(CommissionPayment)
                .filter(CommissionPayment.stripe_payout_id == event_data["payout_id"])
                .first()
            )

            if commission_payment:
                commission_payment.status = PaymentStatus.FAILED
                commission_payment.payout_status = "failed"

                # Revert product sales
                db.query(ProductSale).filter(
                    ProductSale.barber_id == commission_payment.barber_id,
                    ProductSale.sale_date >= commission_payment.period_start,
                    ProductSale.sale_date <= commission_payment.period_end,
                ).update({"commission_paid": False})

                db.commit()

        return {"success": True}

    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid webhook")


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/barber-payments", tags=["barber-payments"]
    )
