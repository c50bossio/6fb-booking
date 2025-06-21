"""
Barber Payment Management API Endpoints with Tremendous
Handles flexible payouts via ACH, PayPal, Venmo, or gift cards
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from config.database import get_db
from models.barber import Barber
from models.barber_payment import (
    BarberPaymentModel,
    BoothRentPayment,
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
from services.tremendous_service import TremendousService


router = APIRouter()


# Pydantic Models
class BarberPaymentModelCreate(BaseModel):
    barber_id: int
    payment_type: PaymentModelType
    booth_rent_amount: Optional[float] = 0.0
    rent_frequency: Optional[str] = "weekly"
    rent_due_day: Optional[int] = 1
    service_commission_rate: Optional[float] = 0.0  # 0-100 percentage
    product_commission_rate: Optional[float] = 15.0  # Default 15%
    payout_method: Optional[str] = "BANK_TRANSFER"  # BANK_TRANSFER, PAYPAL, VENMO
    payout_email: Optional[str] = None
    auto_collect_rent: Optional[bool] = True
    auto_pay_commissions: Optional[bool] = True


class PayoutMethodUpdate(BaseModel):
    payout_method: str = Field(..., regex="^(BANK_TRANSFER|PAYPAL|VENMO|GIFT_CARD)$")
    payout_email: Optional[str] = None  # Required for PayPal/Venmo


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
    payout_method: str
    payout_ready: bool
    status: PaymentStatus


class PayoutRequest(BaseModel):
    barber_id: int
    period_start: datetime
    period_end: datetime
    include_services: bool = True
    include_products: bool = True


class BatchPayoutRequest(BaseModel):
    period_start: datetime
    period_end: datetime
    barber_ids: Optional[List[int]] = None


# API Endpoints
@router.post("/payment-models/", response_model=dict)
async def create_payment_model(
    payment_model: BarberPaymentModelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a payment model for a barber with Tremendous recipient"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Check if payment model already exists
    existing = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == payment_model.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active payment model already exists for this barber",
        )

    # Get barber details
    barber = db.query(Barber).filter(Barber.id == payment_model.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Create Tremendous recipient
    tremendous_service = TremendousService()
    try:
        recipient_data = {
            "first_name": barber.user.first_name,
            "last_name": barber.user.last_name,
            "email": payment_model.payout_email or barber.user.email,
            "delivery_method": payment_model.payout_method,
        }

        tremendous_recipient = tremendous_service.create_recipient(recipient_data)

        # Convert commission rate from percentage to decimal
        db_payment_model = BarberPaymentModel(
            **payment_model.dict(
                exclude={"service_commission_rate", "product_commission_rate"}
            ),
            service_commission_rate=payment_model.service_commission_rate / 100,
            product_commission_rate=payment_model.product_commission_rate / 100,
            tremendous_recipient_id=tremendous_recipient["id"],
            payout_verified=False,  # Will be verified when barber adds payment method
        )

        db.add(db_payment_model)
        db.commit()
        db.refresh(db_payment_model)

        # Send invitation to barber to add their payment method
        tremendous_service.invite_recipient_to_add_payment(tremendous_recipient["id"])

        return {
            "success": True,
            "payment_model_id": db_payment_model.id,
            "message": f"Payment model created. An email has been sent to {recipient_data['email']} to set up their payout method.",
            "recipient_id": tremendous_recipient["id"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment model: {str(e)}",
        )


@router.patch("/payment-models/{payment_model_id}/payout-method", response_model=dict)
async def update_payout_method(
    payment_model_id: int,
    payout_update: PayoutMethodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update barber's payout method (PayPal, Venmo, ACH, etc.)"""
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(BarberPaymentModel.id == payment_model_id)
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment model not found"
        )

    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        # Check if barber is updating their own method
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != payment_model.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Validate email for PayPal/Venmo
    if (
        payout_update.payout_method in ["PAYPAL", "VENMO"]
        and not payout_update.payout_email
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email required for {payout_update.payout_method} payouts",
        )

    # Update payment model
    payment_model.payout_method = payout_update.payout_method
    if payout_update.payout_email:
        payment_model.payout_email = payout_update.payout_email
    payment_model.payout_verified = True  # Mark as verified since they chose method

    db.commit()

    return {
        "success": True,
        "message": f"Payout method updated to {payout_update.payout_method}",
    }


@router.get("/delivery-methods", response_model=List[dict])
async def get_available_delivery_methods(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get available payout methods from Tremendous"""
    tremendous_service = TremendousService()

    try:
        methods = tremendous_service.list_delivery_methods()

        # Filter to commonly used methods
        common_methods = [
            {
                "id": "BANK_TRANSFER",
                "name": "ACH Bank Transfer",
                "description": "1-2 business days",
                "fee": "$0.50 - $2.00",
                "requires_bank_info": True,
            },
            {
                "id": "PAYPAL",
                "name": "PayPal",
                "description": "Instant delivery",
                "fee": "$1.00",
                "requires_email": True,
            },
            {
                "id": "VENMO",
                "name": "Venmo",
                "description": "Instant delivery",
                "fee": "$1.00",
                "requires_email": True,
            },
            {
                "id": "GIFT_CARD",
                "name": "Digital Gift Card",
                "description": "Choose from 100+ brands",
                "fee": "No fee",
                "requires_email": True,
            },
        ]

        return common_methods

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get delivery methods: {str(e)}",
        )


@router.get("/commissions/summary", response_model=List[CommissionSummary])
async def get_commission_summary(
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get commission summary for barbers"""
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
        # Calculate service commissions from appointments
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
                payout_method=model.payout_method,
                payout_ready=model.payout_verified,
                status=PaymentStatus.PENDING,
            )
        )

    return summaries


@router.post("/payouts/process", response_model=dict)
async def process_payout(
    payout_request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process commission payout using Tremendous"""
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

    if not payment_model.payout_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not set up their payout method yet",
        )

    # Calculate amounts (same as before)
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

    # Process Tremendous payout
    tremendous_service = TremendousService()

    try:
        # Get funding source from settings
        payment_integration = db.query(PaymentIntegration).first()

        payout_data = {
            "recipient_id": payment_model.tremendous_recipient_id,
            "amount": Decimal(str(barber_amount)),
            "delivery_method": payment_model.payout_method,
            "funding_source_id": (
                payment_integration.tremendous_funding_source_id
                if payment_integration
                else None
            ),
            "campaign_id": (
                payment_integration.tremendous_campaign_id
                if payment_integration
                else None
            ),
            "external_id": f"barber_{payout_request.barber_id}_period_{payout_request.period_start.date()}",
        }

        payout_result = tremendous_service.send_payout(payout_data)

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
            payment_method=f"tremendous_{payment_model.payout_method.lower()}",
            tremendous_order_id=payout_result["id"],
            tremendous_reward_id=(
                payout_result["rewards"][0]["id"]
                if payout_result.get("rewards")
                else None
            ),
            payout_status=payout_result["status"],
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
            "order_id": payout_result["id"],
            "barber_amount": barber_amount,
            "shop_owner_amount": shop_owner_amount,
            "total_revenue": total_revenue,
            "payout_method": payment_model.payout_method,
            "status": payout_result["status"],
            "message": f"Payout of ${barber_amount:.2f} sent via {payment_model.payout_method}",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.post("/payouts/batch", response_model=dict)
async def process_batch_payouts(
    batch_request: BatchPayoutRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process payouts for multiple barbers at once"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Add background task
    background_tasks.add_task(
        process_batch_payouts_task,
        db,
        batch_request.period_start,
        batch_request.period_end,
        batch_request.barber_ids,
    )

    return {
        "success": True,
        "message": "Batch payout processing started. Barbers will receive their payments based on their chosen method (ACH, PayPal, Venmo).",
        "period": f"{batch_request.period_start.date()} to {batch_request.period_end.date()}",
    }


async def process_batch_payouts_task(
    db: Session,
    period_start: datetime,
    period_end: datetime,
    barber_ids: Optional[List[int]] = None,
):
    """Background task to process batch payouts"""
    tremendous_service = TremendousService()

    try:
        # Get payment integration settings
        payment_integration = db.query(PaymentIntegration).first()

        # Build list of eligible barbers
        query = db.query(BarberPaymentModel).filter(
            BarberPaymentModel.active == True,
            BarberPaymentModel.payout_verified == True,
            BarberPaymentModel.payment_type == PaymentModelType.COMMISSION,
        )

        if barber_ids:
            query = query.filter(BarberPaymentModel.barber_id.in_(barber_ids))

        payment_models = query.all()

        # Prepare payouts
        payouts = []
        commission_records = []

        for model in payment_models:
            # Calculate amounts for each barber
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

            product_revenue = (
                db.query(func.sum(ProductSale.total_amount))
                .filter(
                    ProductSale.barber_id == model.barber_id,
                    ProductSale.sale_date >= period_start,
                    ProductSale.sale_date <= period_end,
                    ProductSale.commission_paid == False,
                )
                .scalar()
                or 0
            )

            total_revenue = float(service_revenue + product_revenue)

            if total_revenue <= 0:
                continue

            # Calculate commission split
            service_commission = float(service_revenue) * model.service_commission_rate
            product_commission = float(product_revenue) * model.product_commission_rate

            shop_owner_amount = service_commission + product_commission
            barber_amount = total_revenue - shop_owner_amount

            if barber_amount <= 0:
                continue

            # Add to batch
            payouts.append(
                {
                    "recipient_id": model.tremendous_recipient_id,
                    "amount": Decimal(str(barber_amount)),
                    "delivery_method": model.payout_method,
                    "funding_source_id": (
                        payment_integration.tremendous_funding_source_id
                        if payment_integration
                        else None
                    ),
                    "external_id": f"barber_{model.barber_id}_period_{period_start.date()}",
                }
            )

            # Prepare commission record
            commission_records.append(
                {
                    "model": model,
                    "service_revenue": float(service_revenue),
                    "service_commission": service_commission,
                    "product_revenue": float(product_revenue),
                    "product_commission": product_commission,
                    "shop_owner_amount": shop_owner_amount,
                    "barber_amount": barber_amount,
                }
            )

        if not payouts:
            return

        # Send batch payout
        batch_result = tremendous_service.batch_payout(payouts)

        # Create commission payment records
        for i, record_data in enumerate(commission_records):
            model = record_data["model"]

            commission_payment = CommissionPayment(
                payment_model_id=model.id,
                barber_id=model.barber_id,
                period_start=period_start,
                period_end=period_end,
                service_revenue=record_data["service_revenue"],
                service_commission_rate=model.service_commission_rate,
                service_commission_amount=record_data["service_commission"],
                product_revenue=record_data["product_revenue"],
                product_commission_rate=model.product_commission_rate,
                product_commission_amount=record_data["product_commission"],
                total_commission=record_data["shop_owner_amount"],
                total_paid=record_data["barber_amount"],
                shop_owner_amount=record_data["shop_owner_amount"],
                barber_amount=record_data["barber_amount"],
                status=PaymentStatus.PENDING,
                payment_method=f"tremendous_{model.payout_method.lower()}",
                tremendous_order_id=batch_result["id"],
                payout_status="PENDING",
            )

            db.add(commission_payment)

            # Mark product sales as paid
            db.query(ProductSale).filter(
                ProductSale.barber_id == model.barber_id,
                ProductSale.sale_date >= period_start,
                ProductSale.sale_date <= period_end,
                ProductSale.commission_paid == False,
            ).update({"commission_paid": True})

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"Batch payout error: {str(e)}")


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/barber-payments", tags=["barber-payments"]
    )
