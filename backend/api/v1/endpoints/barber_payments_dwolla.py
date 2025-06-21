"""
Barber Payment Management API Endpoints with Dwolla
Handles booth rent, commissions, and ACH payouts via Dwolla
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from services.dwolla_service import DwollaService


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
    auto_collect_rent: Optional[bool] = True
    auto_pay_commissions: Optional[bool] = True


class BarberPaymentModelResponse(BaseModel):
    id: int
    barber_id: int
    payment_type: PaymentModelType
    booth_rent_amount: float
    rent_frequency: str
    rent_due_day: int
    service_commission_rate: float
    product_commission_rate: float
    dwolla_customer_id: Optional[str]
    dwolla_funding_source_id: Optional[str]
    dwolla_verified: bool
    auto_collect_rent: bool
    auto_pay_commissions: bool
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BankAccountCreate(BaseModel):
    routing_number: str = Field(..., regex="^[0-9]{9}$")
    account_number: str = Field(..., min_length=4, max_length=17)
    account_type: str = Field(default="checking", regex="^(checking|savings)$")
    account_name: str


class MicroDepositVerification(BaseModel):
    amount1: float = Field(..., gt=0, lt=1)  # Between $0.01 and $0.99
    amount2: float = Field(..., gt=0, lt=1)


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


class DwollaOnboardingResponse(BaseModel):
    customer_id: str
    funding_source_id: str
    verification_required: bool = True
    next_step: str


class BatchPayoutRequest(BaseModel):
    period_start: datetime
    period_end: datetime
    barber_ids: Optional[List[int]] = None  # None means all active barbers


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

    # Get barber details
    barber = db.query(Barber).filter(Barber.id == payment_model.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Create Dwolla customer for the barber
    dwolla_service = DwollaService()
    try:
        customer_data = {
            "first_name": barber.user.first_name,
            "last_name": barber.user.last_name,
            "email": barber.user.email,
            "business_name": (
                barber.business_name if hasattr(barber, "business_name") else None
            ),
        }

        dwolla_customer = dwolla_service.create_customer(customer_data)

        # Convert commission rate from percentage to decimal
        db_payment_model = BarberPaymentModel(
            **payment_model.dict(
                exclude={"service_commission_rate", "product_commission_rate"}
            ),
            service_commission_rate=payment_model.service_commission_rate / 100,
            product_commission_rate=payment_model.product_commission_rate / 100,
            dwolla_customer_id=dwolla_customer["id"],
        )

        db.add(db_payment_model)
        db.commit()
        db.refresh(db_payment_model)

        return db_payment_model

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Dwolla customer: {str(e)}",
        )


@router.post(
    "/payment-models/{payment_model_id}/bank-account",
    response_model=DwollaOnboardingResponse,
)
async def add_bank_account(
    payment_model_id: int,
    bank_account: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add bank account to barber's Dwolla profile"""
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
        # Check if barber is adding their own bank account
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or barber.id != payment_model.barber_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    if not payment_model.dwolla_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dwolla customer not created for this barber",
        )

    dwolla_service = DwollaService()
    try:
        funding_source = dwolla_service.add_bank_account(
            payment_model.dwolla_customer_id, bank_account.dict()
        )

        # Update payment model with funding source
        payment_model.dwolla_funding_source_id = funding_source["id"]
        db.commit()

        return DwollaOnboardingResponse(
            customer_id=payment_model.dwolla_customer_id,
            funding_source_id=funding_source["id"],
            verification_required=True,
            next_step="Please verify the micro-deposits that will appear in your bank account within 1-2 business days",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add bank account: {str(e)}",
        )


@router.post("/payment-models/{payment_model_id}/verify-bank", response_model=dict)
async def verify_bank_account(
    payment_model_id: int,
    verification: MicroDepositVerification,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify bank account with micro-deposit amounts"""
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
    barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
    if not barber or barber.id != payment_model.barber_id:
        rbac = RBACService(db)
        if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    if not payment_model.dwolla_funding_source_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No bank account to verify"
        )

    dwolla_service = DwollaService()
    try:
        success = dwolla_service.verify_micro_deposits(
            payment_model.dwolla_funding_source_id,
            Decimal(str(verification.amount1)),
            Decimal(str(verification.amount2)),
        )

        if success:
            payment_model.dwolla_verified = True
            db.commit()

            return {"success": True, "message": "Bank account verified successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification failed. Please check the amounts.",
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify bank account: {str(e)}",
        )


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


@router.post("/payouts/process", response_model=dict)
async def process_payout(
    payout_request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process commission payout using Dwolla ACH transfer"""
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

    if not payment_model.dwolla_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber's bank account is not verified",
        )

    # Get shop owner's funding source from settings
    payment_integration = db.query(PaymentIntegration).first()
    if (
        not payment_integration
        or not payment_integration.dwolla_master_funding_source_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shop owner's bank account not configured",
        )

    # Calculate amounts (same logic as before)
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

    # Process Dwolla ACH transfer
    dwolla_service = DwollaService()

    try:
        # Create metadata for the transfer
        metadata = {
            "barber_id": str(payout_request.barber_id),
            "period_start": payout_request.period_start.isoformat(),
            "period_end": payout_request.period_end.isoformat(),
            "type": "commission_payout",
        }

        # Create ACH transfer from shop owner to barber
        transfer = dwolla_service.create_transfer(
            source_funding_id=payment_integration.dwolla_master_funding_source_id,
            dest_funding_id=payment_model.dwolla_funding_source_id,
            amount=Decimal(str(barber_amount)),
            metadata=metadata,
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
            status=PaymentStatus.PENDING,  # Will update via webhook when ACH completes
            payment_method="dwolla_ach",
            dwolla_transfer_id=transfer["id"],
            dwolla_transfer_status=transfer["status"],
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
            "transfer_status": transfer["status"],
            "estimated_arrival": "1-2 business days",
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process payouts for multiple barbers at once using Dwolla mass payment"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get shop owner's funding source
    payment_integration = db.query(PaymentIntegration).first()
    if (
        not payment_integration
        or not payment_integration.dwolla_master_funding_source_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shop owner's bank account not configured",
        )

    # Build list of barbers to pay
    query = db.query(BarberPaymentModel).filter(
        BarberPaymentModel.active == True,
        BarberPaymentModel.dwolla_verified == True,
        BarberPaymentModel.payment_type == PaymentModelType.COMMISSION,
    )

    if batch_request.barber_ids:
        query = query.filter(BarberPaymentModel.barber_id.in_(batch_request.barber_ids))

    payment_models = query.all()

    if not payment_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No eligible barbers found for payout",
        )

    # Prepare mass payment items
    payment_items = []
    commission_payments = []
    total_payout = Decimal("0.00")

    for model in payment_models:
        # Calculate amounts for each barber
        service_revenue = (
            db.query(func.sum(Payment.amount))
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .filter(
                Appointment.barber_id == model.barber_id,
                Payment.status == "succeeded",
                Payment.created_at >= batch_request.period_start,
                Payment.created_at <= batch_request.period_end,
            )
            .scalar()
            or 0
        )

        product_revenue = (
            db.query(func.sum(ProductSale.total_amount))
            .filter(
                ProductSale.barber_id == model.barber_id,
                ProductSale.sale_date >= batch_request.period_start,
                ProductSale.sale_date <= batch_request.period_end,
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

        # Add to mass payment
        payment_items.append(
            {
                "destination_id": model.dwolla_funding_source_id,
                "amount": Decimal(str(barber_amount)),
                "metadata": {
                    "barber_id": str(model.barber_id),
                    "period": f"{batch_request.period_start.date()} to {batch_request.period_end.date()}",
                },
            }
        )

        # Prepare commission payment record
        commission_payments.append(
            {
                "model": model,
                "barber_id": model.barber_id,
                "service_revenue": float(service_revenue),
                "service_commission": service_commission,
                "product_revenue": float(product_revenue),
                "product_commission": product_commission,
                "shop_owner_amount": shop_owner_amount,
                "barber_amount": barber_amount,
            }
        )

        total_payout += Decimal(str(barber_amount))

    if not payment_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No payments to process"
        )

    # Process mass payment via Dwolla
    dwolla_service = DwollaService()

    try:
        mass_payment = dwolla_service.create_mass_payment(
            source_funding_id=payment_integration.dwolla_master_funding_source_id,
            payments=payment_items,
        )

        # Create commission payment records
        for payment_data in commission_payments:
            commission_payment = CommissionPayment(
                payment_model_id=payment_data["model"].id,
                barber_id=payment_data["barber_id"],
                period_start=batch_request.period_start,
                period_end=batch_request.period_end,
                service_revenue=payment_data["service_revenue"],
                service_commission_rate=payment_data["model"].service_commission_rate,
                service_commission_amount=payment_data["service_commission"],
                product_revenue=payment_data["product_revenue"],
                product_commission_rate=payment_data["model"].product_commission_rate,
                product_commission_amount=payment_data["product_commission"],
                total_commission=payment_data["shop_owner_amount"],
                total_paid=payment_data["barber_amount"],
                shop_owner_amount=payment_data["shop_owner_amount"],
                barber_amount=payment_data["barber_amount"],
                status=PaymentStatus.PENDING,
                payment_method="dwolla_mass_payment",
                dwolla_transfer_id=mass_payment["id"],
                dwolla_transfer_status="pending",
            )

            db.add(commission_payment)

            # Mark product sales as paid
            db.query(ProductSale).filter(
                ProductSale.barber_id == payment_data["barber_id"],
                ProductSale.sale_date >= batch_request.period_start,
                ProductSale.sale_date <= batch_request.period_end,
                ProductSale.commission_paid == False,
            ).update({"commission_paid": True})

        db.commit()

        return {
            "success": True,
            "mass_payment_id": mass_payment["id"],
            "total_amount": float(total_payout),
            "barber_count": len(payment_items),
            "estimated_arrival": "1-2 business days",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process batch payout: {str(e)}",
        )


@router.post("/dwolla/webhook", include_in_schema=False)
async def handle_dwolla_webhook(request: dict, db: Session = Depends(get_db)):
    """Handle Dwolla webhooks for transfer status updates"""
    # Verify webhook signature here in production

    event_type = request.get("topic")
    resource_id = request.get("resourceId")

    if event_type == "transfer_completed":
        # Update commission payment status
        commission_payment = (
            db.query(CommissionPayment)
            .filter(CommissionPayment.dwolla_transfer_id == resource_id)
            .first()
        )

        if commission_payment:
            commission_payment.status = PaymentStatus.PAID
            commission_payment.paid_date = datetime.utcnow()
            commission_payment.dwolla_transfer_status = "completed"
            db.commit()

    elif event_type == "transfer_failed":
        # Handle failed transfer
        commission_payment = (
            db.query(CommissionPayment)
            .filter(CommissionPayment.dwolla_transfer_id == resource_id)
            .first()
        )

        if commission_payment:
            commission_payment.status = PaymentStatus.CANCELLED
            commission_payment.dwolla_transfer_status = "failed"

            # Revert product sales commission paid status
            db.query(ProductSale).filter(
                ProductSale.barber_id == commission_payment.barber_id,
                ProductSale.sale_date >= commission_payment.period_start,
                ProductSale.sale_date <= commission_payment.period_end,
            ).update({"commission_paid": False})

            db.commit()

    return {"status": "ok"}


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/barber-payments", tags=["barber-payments"]
    )
