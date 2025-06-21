"""
Barber Payment Management with Square Payouts
Seamless integration with existing Square POS system
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
from services.square_payouts_service import SquarePayoutsService


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
    square_location_id: str  # Required for Square payouts
    enable_instant_payouts: Optional[bool] = False
    auto_pay_commissions: Optional[bool] = True


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
    square_account_verified: bool
    can_receive_payouts: bool


class PayoutRequest(BaseModel):
    barber_id: int
    period_start: datetime
    period_end: datetime
    include_services: bool = True
    include_products: bool = True
    instant_payout: bool = False  # Use instant payout (1.75% fee)


class SquareOnboardingResponse(BaseModel):
    team_member_id: str
    invitation_sent: bool
    next_steps: str


# API Endpoints
@router.post("/setup-square-team-member", response_model=SquareOnboardingResponse)
async def setup_square_team_member(
    barber_id: int,
    location_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 1: Create Square team member for barber
    This sends them an invitation to set up their Square account and bank details
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get barber details
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Check if already has Square team member
    existing_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id,
            BarberPaymentModel.square_team_member_id.isnot(None),
        )
        .first()
    )

    if existing_model:
        return SquareOnboardingResponse(
            team_member_id=existing_model.square_team_member_id,
            invitation_sent=False,
            next_steps="Barber already has Square team member account",
        )

    # Create Square team member
    square_service = SquarePayoutsService()

    try:
        team_member_data = {
            "first_name": barber.user.first_name,
            "last_name": barber.user.last_name,
            "email": barber.user.email,
            "phone": barber.user.phone,
            "location_ids": [location_id],
        }

        team_member = square_service.create_team_member_for_barber(team_member_data)

        # Create or update payment model
        payment_model = (
            db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == barber_id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if payment_model:
            payment_model.square_team_member_id = team_member["id"]
            payment_model.square_location_id = location_id
        else:
            payment_model = BarberPaymentModel(
                barber_id=barber_id,
                payment_type=PaymentModelType.COMMISSION,
                service_commission_rate=0.30,  # Default 30%
                product_commission_rate=0.15,  # Default 15%
                square_team_member_id=team_member["id"],
                square_location_id=location_id,
                square_employee_id=team_member[
                    "id"
                ],  # Also store as employee for sales tracking
            )
            db.add(payment_model)

        db.commit()

        return SquareOnboardingResponse(
            team_member_id=team_member["id"],
            invitation_sent=True,
            next_steps="Barber will receive an email from Square to set up their bank account. Once completed, they can receive payouts.",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Square team member: {str(e)}",
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

    square_service = SquarePayoutsService()

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

        # Check if can receive payouts
        can_receive_payouts = False
        if model.square_team_member_id:
            try:
                can_receive_payouts = square_service.validate_bank_account(
                    model.square_team_member_id
                )
            except:
                pass

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
                payout_method="ACH" if not model.enable_instant_payouts else "INSTANT",
                square_account_verified=can_receive_payouts,
                can_receive_payouts=can_receive_payouts,
            )
        )

    return summaries


@router.post("/payouts/process", response_model=dict)
async def process_payout(
    payout_request: PayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process commission payout using Square Payouts"""
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

    if not payment_model.square_team_member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not been set up as Square team member",
        )

    # Validate bank account
    square_service = SquarePayoutsService()

    if not square_service.validate_bank_account(payment_model.square_team_member_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not completed Square account setup. They need to accept the invitation and add bank details.",
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

    # Process Square payout
    try:
        payout_data = {
            "team_member_id": payment_model.square_team_member_id,
            "amount": barber_amount,
            "location_id": payment_model.square_location_id,
            "reference_id": f"commission_{payout_request.barber_id}_{payout_request.period_start.date()}",
            "note": f"Commission payout for {payout_request.period_start.date()} to {payout_request.period_end.date()}",
        }

        # Choose payout method
        if payout_request.instant_payout and payment_model.enable_instant_payouts:
            payout_result = square_service.create_instant_payout(payout_data)
            payout_method = "INSTANT"
            fee = payout_result.get("fee", 0)
        else:
            payout_result = square_service.create_payout(payout_data)
            payout_method = "ACH"
            fee = 0

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
            payment_method=f"square_{payout_method.lower()}",
            square_payout_id=payout_result["id"],
            payout_status=payout_result["status"],
            payout_arrival_date=(
                datetime.fromisoformat(
                    payout_result["arrival_date"].replace("Z", "+00:00")
                )
                if payout_result.get("arrival_date")
                else None
            ),
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
            "payout_id": payout_result["id"],
            "barber_amount": barber_amount,
            "shop_owner_amount": shop_owner_amount,
            "total_revenue": total_revenue,
            "payout_method": payout_method,
            "status": payout_result["status"],
            "arrival_date": payout_result.get("arrival_date"),
            "fee": fee,
            "message": f"Payout of ${barber_amount:.2f} sent via Square {payout_method}",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.post("/payouts/batch", response_model=dict)
async def process_batch_payouts(
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    location_id: str = Query(...),
    instant: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process payouts for all eligible barbers at once"""
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get all barbers with Square team member accounts
    payment_models = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.active == True,
            BarberPaymentModel.square_team_member_id.isnot(None),
            BarberPaymentModel.square_location_id == location_id,
            BarberPaymentModel.payment_type == PaymentModelType.COMMISSION,
        )
        .all()
    )

    if not payment_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No eligible barbers found for payouts",
        )

    square_service = SquarePayoutsService()
    payouts = []

    for model in payment_models:
        # Validate bank account
        if not square_service.validate_bank_account(model.square_team_member_id):
            continue

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

        payouts.append(
            {
                "team_member_id": model.square_team_member_id,
                "amount": barber_amount,
                "location_id": location_id,
                "reference_id": f"commission_{model.barber_id}_{period_start.date()}",
                "note": f"Weekly commission payout",
                "barber_id": model.barber_id,
                "service_revenue": float(service_revenue),
                "product_revenue": float(product_revenue),
                "service_commission": service_commission,
                "product_commission": product_commission,
                "shop_owner_amount": shop_owner_amount,
            }
        )

    if not payouts:
        return {
            "success": True,
            "message": "No payouts to process",
            "processed_count": 0,
            "total_amount": 0,
        }

    # Process payouts
    result = square_service.batch_create_payouts(payouts)

    # Create commission payment records for successful payouts
    for i, payout in enumerate(payouts):
        if i < len(result["successful_payouts"]):
            payout_result = result["successful_payouts"][i]

            commission_payment = CommissionPayment(
                payment_model_id=db.query(BarberPaymentModel)
                .filter(BarberPaymentModel.barber_id == payout["barber_id"])
                .first()
                .id,
                barber_id=payout["barber_id"],
                period_start=period_start,
                period_end=period_end,
                service_revenue=payout["service_revenue"],
                service_commission_rate=0.30,  # Get from model
                service_commission_amount=payout["service_commission"],
                product_revenue=payout["product_revenue"],
                product_commission_rate=0.15,  # Get from model
                product_commission_amount=payout["product_commission"],
                total_commission=payout["shop_owner_amount"],
                total_paid=payout["amount"],
                shop_owner_amount=payout["shop_owner_amount"],
                barber_amount=payout["amount"],
                status=PaymentStatus.PENDING,
                payment_method="square_ach",
                square_payout_id=payout_result["id"],
                payout_status=payout_result["status"],
            )

            db.add(commission_payment)

            # Mark product sales as paid
            db.query(ProductSale).filter(
                ProductSale.barber_id == payout["barber_id"],
                ProductSale.sale_date >= period_start,
                ProductSale.sale_date <= period_end,
                ProductSale.commission_paid == False,
            ).update({"commission_paid": True})

    db.commit()

    return {
        "success": True,
        "processed_count": result["successful_count"],
        "failed_count": result["failed_count"],
        "total_amount": result["total_amount"],
        "message": f"Processed {result['successful_count']} payouts totaling ${result['total_amount']:.2f}",
    }


@router.get("/payout-status/{payout_id}")
async def get_payout_status(
    payout_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check the status of a specific payout"""
    square_service = SquarePayoutsService()

    try:
        status = square_service.get_payout_status(payout_id)

        # Update local record if status changed
        commission_payment = (
            db.query(CommissionPayment)
            .filter(CommissionPayment.square_payout_id == payout_id)
            .first()
        )

        if commission_payment and status["status"] != commission_payment.payout_status:
            commission_payment.payout_status = status["status"]
            if status["status"] == "PAID":
                commission_payment.status = PaymentStatus.PAID
                commission_payment.paid_date = datetime.utcnow()
            elif status["status"] == "FAILED":
                commission_payment.status = PaymentStatus.CANCELLED

            db.commit()

        return status

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payout status: {str(e)}",
        )


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/barber-payments", tags=["barber-payments"]
    )
