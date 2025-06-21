"""
Barber Payment Management API Endpoints
Handles booth rent, commissions, and Stripe Connect payouts
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
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
from services.stripe_connect_service import StripeConnectService


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
    stripe_connect_account_id: Optional[str] = None
    auto_collect_rent: Optional[bool] = True
    auto_pay_commissions: Optional[bool] = True


class BarberPaymentModelUpdate(BaseModel):
    payment_type: Optional[PaymentModelType] = None
    booth_rent_amount: Optional[float] = None
    rent_frequency: Optional[str] = None
    rent_due_day: Optional[int] = None
    service_commission_rate: Optional[float] = None
    product_commission_rate: Optional[float] = None
    stripe_connect_account_id: Optional[str] = None
    auto_collect_rent: Optional[bool] = None
    auto_pay_commissions: Optional[bool] = None
    active: Optional[bool] = None


class BarberPaymentModelResponse(BaseModel):
    id: int
    barber_id: int
    payment_type: PaymentModelType
    booth_rent_amount: float
    rent_frequency: str
    rent_due_day: int
    service_commission_rate: float
    product_commission_rate: float
    stripe_connect_account_id: Optional[str]
    stripe_payout_enabled: bool
    auto_collect_rent: bool
    auto_pay_commissions: bool
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductSaleCreate(BaseModel):
    barber_id: int
    product_name: str
    product_sku: Optional[str] = None
    category: Optional[str] = None
    sale_price: float
    cost_price: Optional[float] = None
    quantity: int = 1
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    appointment_id: Optional[int] = None
    square_transaction_id: Optional[str] = None


class ProductSaleResponse(BaseModel):
    id: int
    barber_id: int
    product_name: str
    product_sku: Optional[str]
    category: Optional[str]
    sale_price: float
    quantity: int
    total_amount: float
    commission_rate: float
    commission_amount: float
    commission_paid: bool
    sale_date: datetime

    class Config:
        from_attributes = True


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
    status: PaymentStatus


class PayoutRequest(BaseModel):
    barber_id: int
    period_start: datetime
    period_end: datetime
    include_services: bool = True
    include_products: bool = True


class StripeConnectOnboardingResponse(BaseModel):
    onboarding_url: str
    account_id: str
    expires_at: datetime


# API Endpoints
@router.post("/payment-models/", response_model=BarberPaymentModelResponse)
async def create_payment_model(
    payment_model: BarberPaymentModelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a payment model for a barber"""
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

    # Convert commission rate from percentage to decimal
    db_payment_model = BarberPaymentModel(
        **payment_model.dict(
            exclude={"service_commission_rate", "product_commission_rate"}
        ),
        service_commission_rate=payment_model.service_commission_rate / 100,
        product_commission_rate=payment_model.product_commission_rate / 100,
    )

    db.add(db_payment_model)
    db.commit()
    db.refresh(db_payment_model)

    return db_payment_model


@router.get("/payment-models/{barber_id}", response_model=BarberPaymentModelResponse)
async def get_payment_model(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment model for a specific barber"""
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment model not found"
        )

    return payment_model


@router.patch(
    "/payment-models/{payment_model_id}", response_model=BarberPaymentModelResponse
)
async def update_payment_model(
    payment_model_id: int,
    update_data: BarberPaymentModelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a payment model"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    payment_model = (
        db.query(BarberPaymentModel)
        .filter(BarberPaymentModel.id == payment_model_id)
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment model not found"
        )

    update_dict = update_data.dict(exclude_unset=True)

    # Convert commission rates if provided
    if "service_commission_rate" in update_dict:
        update_dict["service_commission_rate"] = (
            update_dict["service_commission_rate"] / 100
        )
    if "product_commission_rate" in update_dict:
        update_dict["product_commission_rate"] = (
            update_dict["product_commission_rate"] / 100
        )

    for field, value in update_dict.items():
        setattr(payment_model, field, value)

    db.commit()
    db.refresh(payment_model)

    return payment_model


@router.post("/product-sales/", response_model=ProductSaleResponse)
async def record_product_sale(
    sale: ProductSaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a product sale for commission tracking"""
    # Get barber's payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == sale.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active payment model found for barber",
        )

    # Calculate commission
    total_amount = sale.sale_price * sale.quantity
    commission_amount = total_amount * payment_model.product_commission_rate

    db_sale = ProductSale(
        **sale.dict(),
        total_amount=total_amount,
        commission_rate=payment_model.product_commission_rate,
        commission_amount=commission_amount,
    )

    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)

    return db_sale


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

        # Calculate split (shop owner gets the commission, barber gets the rest)
        if model.payment_type == PaymentModelType.COMMISSION:
            shop_owner_portion = total_commission
            barber_portion = float(service_revenue + product_revenue) - total_commission
        else:
            # For other payment types, this would be handled differently
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
                status=PaymentStatus.PENDING,
            )
        )

    return summaries


@router.post(
    "/stripe-connect/onboard/{barber_id}",
    response_model=StripeConnectOnboardingResponse,
)
async def create_stripe_connect_onboarding(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create Stripe Connect onboarding link for a barber"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        # Check if barber is onboarding themselves
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    stripe_service = StripeConnectService()

    # Create or retrieve Stripe Connect account
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if payment_model and payment_model.stripe_connect_account_id:
        account_id = payment_model.stripe_connect_account_id
    else:
        # Create new Stripe Connect account
        account = stripe_service.create_connected_account(
            email=barber.user.email,
            first_name=barber.user.first_name,
            last_name=barber.user.last_name,
        )
        account_id = account["id"]

        # Update payment model
        if payment_model:
            payment_model.stripe_connect_account_id = account_id
            db.commit()

    # Create onboarding link
    onboarding_link = stripe_service.create_account_link(
        account_id=account_id,
        return_url=f"https://yourdomain.com/barbers/{barber_id}/onboarding/complete",
        refresh_url=f"https://yourdomain.com/barbers/{barber_id}/onboarding/refresh",
    )

    return StripeConnectOnboardingResponse(
        onboarding_url=onboarding_link["url"],
        account_id=account_id,
        expires_at=datetime.fromtimestamp(onboarding_link["expires_at"]),
    )


@router.post("/payouts/process", response_model=dict)
async def process_payout(
    payout_request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process commission payout using Stripe Connect"""
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

    if not payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not completed Stripe Connect onboarding",
        )

    # Calculate amounts
    # Get service revenue
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

    # Get product revenue
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

    # Calculate split based on payment model
    if payment_model.payment_type == PaymentModelType.COMMISSION:
        # Shop owner gets commission percentage, barber gets the rest
        service_commission = (
            float(service_revenue) * payment_model.service_commission_rate
        )
        product_commission = (
            float(product_revenue) * payment_model.product_commission_rate
        )

        shop_owner_amount = service_commission + product_commission
        barber_amount = total_revenue - shop_owner_amount
    else:
        # For other payment types, implement different logic
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payout not implemented for {payment_model.payment_type} payment type",
        )

    # Process Stripe transfer to barber
    stripe_service = StripeConnectService()

    try:
        # Create transfer to connected account
        transfer = stripe_service.create_transfer(
            amount=int(barber_amount * 100),  # Convert to cents
            destination=payment_model.stripe_connect_account_id,
            description=f"Commission payout for {payout_request.period_start.date()} to {payout_request.period_end.date()}",
        )

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
            status=PaymentStatus.PAID,
            payment_method="stripe_connect",
            paid_date=datetime.utcnow(),
            stripe_transfer_id=transfer["id"],
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
            "transfer_id": transfer["id"],
            "barber_amount": barber_amount,
            "shop_owner_amount": shop_owner_amount,
            "total_revenue": total_revenue,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.get("/booth-rent/due", response_model=List[dict])
async def get_due_booth_rent(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get upcoming booth rent payments"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get all active payment models with booth rent
    payment_models = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.active == True,
            BarberPaymentModel.payment_type.in_(
                [PaymentModelType.BOOTH_RENT, PaymentModelType.HYBRID]
            ),
            BarberPaymentModel.booth_rent_amount > 0,
        )
        .all()
    )

    due_payments = []

    for model in payment_models:
        # Check if rent payment exists for current period
        today = datetime.utcnow().date()

        if model.rent_frequency == "weekly":
            # Calculate current week's start
            days_since_due = (today.weekday() - model.rent_due_day) % 7
            period_start = today - timedelta(days=days_since_due)
            period_end = period_start + timedelta(days=6)
        else:  # monthly
            # Calculate current month's period
            if today.day >= model.rent_due_day:
                period_start = today.replace(day=model.rent_due_day)
            else:
                # Previous month
                if today.month == 1:
                    period_start = today.replace(
                        year=today.year - 1, month=12, day=model.rent_due_day
                    )
                else:
                    period_start = today.replace(
                        month=today.month - 1, day=model.rent_due_day
                    )

            # Calculate period end
            if period_start.month == 12:
                period_end = period_start.replace(
                    year=period_start.year + 1, month=1, day=model.rent_due_day - 1
                )
            else:
                period_end = period_start.replace(
                    month=period_start.month + 1, day=model.rent_due_day - 1
                )

        # Check if payment exists
        existing_payment = (
            db.query(BoothRentPayment)
            .filter(
                BoothRentPayment.payment_model_id == model.id,
                BoothRentPayment.period_start <= period_start,
                BoothRentPayment.period_end >= period_end,
            )
            .first()
        )

        if not existing_payment:
            barber = db.query(Barber).filter(Barber.id == model.barber_id).first()
            due_payments.append(
                {
                    "barber_id": model.barber_id,
                    "barber_name": f"{barber.user.first_name} {barber.user.last_name}",
                    "amount_due": float(model.booth_rent_amount),
                    "period_start": period_start,
                    "period_end": period_end,
                    "frequency": model.rent_frequency,
                    "payment_model_id": model.id,
                }
            )

    return due_payments


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/barber-payments", tags=["barber-payments"]
    )
