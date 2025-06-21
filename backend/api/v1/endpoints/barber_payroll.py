"""
Simple Barber Payroll System
Track revenue, calculate commissions, process payouts
For a single barbershop - not a marketplace
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

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


router = APIRouter()


# Pydantic Models
class BarberSetupRequest(BaseModel):
    barber_id: int
    payment_type: str = "commission"  # commission, booth_rent, or hybrid
    commission_rate: float = 30.0  # Shop keeps 30%
    booth_rent_weekly: Optional[float] = 0.0
    preferred_payout_method: str = "ach"  # ach, zelle, venmo, check


class PayrollSummary(BaseModel):
    barber_id: int
    barber_name: str
    period: str
    total_services: float
    total_products: float
    total_revenue: float
    commission_rate: float
    shop_keeps: float
    barber_gets: float
    booth_rent_due: float
    net_payout: float
    payout_method: str


class PayoutRecord(BaseModel):
    barber_id: int
    amount: float
    method: str  # ach, zelle, venmo, check
    reference: Optional[str] = None  # Check number, Zelle confirmation, etc


# API Endpoints
@router.post("/setup-barber")
async def setup_barber_payment(
    setup: BarberSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set up how a barber gets paid in YOUR shop
    Simple: commission rate and preferred payout method
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can set up barber payments",
        )

    # Check if barber exists
    barber = db.query(Barber).filter(Barber.id == setup.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Create or update payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(BarberPaymentModel.barber_id == setup.barber_id)
        .first()
    )

    if payment_model:
        # Update existing
        payment_model.payment_type = setup.payment_type
        payment_model.service_commission_rate = setup.commission_rate / 100
        payment_model.booth_rent_amount = setup.booth_rent_weekly
        payment_model.payout_method = setup.preferred_payout_method
    else:
        # Create new
        payment_model = BarberPaymentModel(
            barber_id=setup.barber_id,
            payment_type=setup.payment_type,
            service_commission_rate=setup.commission_rate / 100,
            product_commission_rate=0.15,  # Default 15% on products
            booth_rent_amount=setup.booth_rent_weekly,
            rent_frequency="weekly",
            payout_method=setup.preferred_payout_method,
            active=True,
        )
        db.add(payment_model)

    db.commit()

    return {
        "success": True,
        "message": f"Payment setup complete for {barber.user.first_name}",
        "commission_rate": f"{setup.commission_rate}%",
        "payout_method": setup.preferred_payout_method,
    }


@router.get("/payroll-summary")
async def get_payroll_summary(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[PayrollSummary]:
    """
    Get payroll summary for all barbers
    Shows exactly what to pay each barber for the period
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can view payroll",
        )

    # Get all active barbers
    barbers = (
        db.query(Barber)
        .join(BarberPaymentModel, Barber.id == BarberPaymentModel.barber_id)
        .filter(BarberPaymentModel.active == True)
        .all()
    )

    summaries = []

    for barber in barbers:
        payment_model = barber.payment_model[0]

        # Calculate service revenue
        service_revenue = (
            db.query(func.sum(Payment.amount))
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .filter(
                Appointment.barber_id == barber.id,
                Payment.status == "succeeded",
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
            )
            .scalar()
            or 0
        )

        # Calculate product revenue
        product_revenue = (
            db.query(func.sum(ProductSale.total_amount))
            .filter(
                ProductSale.barber_id == barber.id,
                ProductSale.sale_date >= start_date,
                ProductSale.sale_date <= end_date,
            )
            .scalar()
            or 0
        )

        total_revenue = float(service_revenue + product_revenue)

        # Calculate what shop keeps
        service_commission = (
            float(service_revenue) * payment_model.service_commission_rate
        )
        product_commission = (
            float(product_revenue) * payment_model.product_commission_rate
        )
        shop_keeps = service_commission + product_commission

        # Calculate what barber gets
        barber_gets = total_revenue - shop_keeps

        # Subtract booth rent if applicable
        booth_rent = 0
        if payment_model.payment_type in ["booth_rent", "hybrid"]:
            # Calculate weeks in period
            weeks = (end_date - start_date).days / 7
            booth_rent = float(payment_model.booth_rent_amount) * weeks

        net_payout = barber_gets - booth_rent

        summaries.append(
            PayrollSummary(
                barber_id=barber.id,
                barber_name=f"{barber.user.first_name} {barber.user.last_name}",
                period=f"{start_date.date()} to {end_date.date()}",
                total_services=float(service_revenue),
                total_products=float(product_revenue),
                total_revenue=total_revenue,
                commission_rate=payment_model.service_commission_rate * 100,
                shop_keeps=shop_keeps,
                barber_gets=barber_gets,
                booth_rent_due=booth_rent,
                net_payout=net_payout,
                payout_method=payment_model.payout_method or "check",
            )
        )

    return summaries


@router.post("/record-payout")
async def record_payout(
    payout: PayoutRecord,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record that you paid a barber (via Zelle, check, etc)
    This is just for record keeping
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can record payouts",
        )

    # Get payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == payout.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barber payment model not found",
        )

    # Record the payout
    commission_payment = CommissionPayment(
        payment_model_id=payment_model.id,
        barber_id=payout.barber_id,
        period_start=datetime.utcnow() - timedelta(days=7),  # Last week
        period_end=datetime.utcnow(),
        total_commission=0,  # Will calculate later
        total_paid=payout.amount,
        barber_amount=payout.amount,
        shop_owner_amount=0,  # Already kept via daily deposits
        status=PaymentStatus.PAID,
        payment_method=payout.method,
        paid_date=datetime.utcnow(),
        notes=f"Reference: {payout.reference}" if payout.reference else None,
    )

    db.add(commission_payment)
    db.commit()

    return {
        "success": True,
        "message": f"Recorded ${payout.amount} payout via {payout.method}",
    }


@router.get("/payout-history/{barber_id}")
async def get_payout_history(
    barber_id: int,
    limit: int = Query(10, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get payout history for a specific barber
    Barbers can view their own, owner can view all
    """
    # Check permissions
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    if barber.user_id != current_user.id:
        rbac = RBACService(db)
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only view your own payout history",
            )

    # Get payout history
    payouts = (
        db.query(CommissionPayment)
        .filter(
            CommissionPayment.barber_id == barber_id,
            CommissionPayment.status == PaymentStatus.PAID,
        )
        .order_by(CommissionPayment.paid_date.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "date": payout.paid_date,
            "period": f"{payout.period_start.date()} to {payout.period_end.date()}",
            "amount": payout.total_paid,
            "method": payout.payment_method,
            "reference": payout.notes,
        }
        for payout in payouts
    ]


@router.get("/revenue-report")
async def get_revenue_report(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Shop owner's revenue report
    Shows total revenue, commissions kept, and payouts made
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can view revenue reports",
        )

    # Total service revenue
    total_service_revenue = (
        db.query(func.sum(Payment.amount))
        .join(Appointment, Payment.appointment_id == Appointment.id)
        .filter(
            Payment.status == "succeeded",
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
        )
        .scalar()
        or 0
    )

    # Total product revenue
    total_product_revenue = (
        db.query(func.sum(ProductSale.total_amount))
        .filter(ProductSale.sale_date >= start_date, ProductSale.sale_date <= end_date)
        .scalar()
        or 0
    )

    # Total payouts made
    total_payouts = (
        db.query(func.sum(CommissionPayment.total_paid))
        .filter(
            CommissionPayment.paid_date >= start_date,
            CommissionPayment.paid_date <= end_date,
            CommissionPayment.status == PaymentStatus.PAID,
        )
        .scalar()
        or 0
    )

    # Calculate shop's net revenue
    gross_revenue = float(total_service_revenue + total_product_revenue)
    net_revenue = gross_revenue - float(total_payouts)

    return {
        "period": f"{start_date.date()} to {end_date.date()}",
        "gross_revenue": gross_revenue,
        "service_revenue": float(total_service_revenue),
        "product_revenue": float(total_product_revenue),
        "total_payouts": float(total_payouts),
        "net_revenue": net_revenue,
        "profit_margin": (
            (net_revenue / gross_revenue * 100) if gross_revenue > 0 else 0
        ),
    }


@router.get("/export-payroll")
async def export_payroll_csv(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export payroll data as CSV for accounting
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can export payroll",
        )

    # Get payroll data
    summaries = await get_payroll_summary(start_date, end_date, current_user, db)

    # Create CSV
    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(
        [
            "Barber Name",
            "Period",
            "Total Revenue",
            "Commission Rate",
            "Shop Keeps",
            "Barber Gets",
            "Booth Rent",
            "Net Payout",
            "Payout Method",
        ]
    )

    # Data rows
    for summary in summaries:
        writer.writerow(
            [
                summary.barber_name,
                summary.period,
                f"${summary.total_revenue:.2f}",
                f"{summary.commission_rate}%",
                f"${summary.shop_keeps:.2f}",
                f"${summary.barber_gets:.2f}",
                f"${summary.booth_rent_due:.2f}",
                f"${summary.net_payout:.2f}",
                summary.payout_method,
            ]
        )

    # Total row
    writer.writerow([])
    writer.writerow(
        [
            "TOTAL",
            "",
            f"${sum(s.total_revenue for s in summaries):.2f}",
            "",
            f"${sum(s.shop_keeps for s in summaries):.2f}",
            f"${sum(s.barber_gets for s in summaries):.2f}",
            f"${sum(s.booth_rent_due for s in summaries):.2f}",
            f"${sum(s.net_payout for s in summaries):.2f}",
            "",
        ]
    )

    output.seek(0)

    from fastapi.responses import Response

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=payroll_{start_date.date()}_{end_date.date()}.csv"
        },
    )


# Include in main router
def include_router(app):
    app.include_router(router, prefix="/api/v1/payroll", tags=["payroll"])
