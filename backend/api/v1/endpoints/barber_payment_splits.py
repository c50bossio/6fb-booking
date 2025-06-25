"""
Barber Payment Splits API
Barbers connect their own Square/Stripe accounts
Payments automatically split - shop keeps commission, barber gets the rest instantly
"""

from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
import secrets
import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config.database import get_db
from models.barber import Barber
from models.barber_payment import BarberPaymentModel, PaymentModelType
from models.appointment import Appointment
from models.payment import Payment
from api.v1.auth import get_current_user
from models.user import User
from services.rbac_service import RBACService, Permission
from services.payment_split_service import PaymentSplitService


router = APIRouter()


# Pydantic Models
class ConnectAccountRequest(BaseModel):
    barber_id: int
    platform: str  # 'stripe' or 'square'


class ConnectAccountResponse(BaseModel):
    oauth_url: str
    platform: str
    state_token: str


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str
    platform: str  # 'stripe' or 'square'


class PaymentSplitRequest(BaseModel):
    appointment_id: int
    amount: float
    payment_method_id: Optional[str] = None  # For Stripe
    source_id: Optional[str] = None  # For Square
    customer_id: Optional[str] = None
    description: Optional[str] = None


class PaymentModelUpdate(BaseModel):
    payment_type: PaymentModelType
    service_commission_rate: Optional[float] = 30.0  # 30% default
    product_commission_rate: Optional[float] = 15.0  # 15% default
    booth_rent_amount: Optional[float] = 0.0
    rent_frequency: Optional[str] = "weekly"


# API Endpoints
@router.post("/connect-account", response_model=ConnectAccountResponse)
async def start_account_connection(
    request: ConnectAccountRequest,
    db: Session = Depends(get_db),
):
    """
    Start OAuth flow for barber to connect their Square or Stripe account
    This lets them receive instant payments minus commission/booth rent
    """
    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == request.barber_id).first()
    if not barber:
        # For testing, allow OAuth even if barber doesn't exist yet
        pass

    # Generate secure state token
    state_token = secrets.token_urlsafe(32)

    # Create OAuth URL based on platform
    split_service = PaymentSplitService()

    if request.platform.lower() == "stripe":
        oauth_url = split_service.create_stripe_connect_oauth_url(
            barber_id=request.barber_id, state=state_token
        )
    elif request.platform.lower() == "square":
        oauth_url = split_service.create_square_oauth_url(
            barber_id=request.barber_id, state=state_token
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform must be 'stripe' or 'square'",
        )

    return ConnectAccountResponse(
        oauth_url=oauth_url, platform=request.platform, state_token=state_token
    )


@router.get("/oauth-callback")
async def handle_oauth_callback(
    code: str,
    state: Optional[str] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Handle OAuth callback from Square or Stripe
    Saves the connected account details
    """
    # Parse barber_id from state if provided
    if state:
        try:
            barber_id, state_token = state.split(":")
            barber_id = int(barber_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter",
            )
    else:
        # Default to barber_id 1 for testing
        barber_id = 1
        state_token = "test"

    # Detect platform from the code format if not provided
    if not platform:
        if code.startswith("ac_"):
            platform = "stripe"
        else:
            platform = "square"

    # Get or create payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model:
        payment_model = BarberPaymentModel(
            barber_id=barber_id,
            payment_type=PaymentModelType.COMMISSION,
            service_commission_rate=0.30,  # 30% default
            product_commission_rate=0.15,  # 15% default
            active=True,
        )
        db.add(payment_model)

    # Complete OAuth based on platform
    split_service = PaymentSplitService()

    try:
        if platform.lower() == "stripe":
            result = split_service.complete_stripe_oauth(code)
            payment_model.stripe_connect_account_id = result["stripe_account_id"]
            payment_model.stripe_payouts_enabled = True
            payment_model.stripe_onboarding_completed = True

        elif platform.lower() == "square":
            result = split_service.complete_square_oauth(code)
            # Store Square merchant ID and access token securely
            payment_model.square_merchant_id = result["merchant_id"]
            # In production, encrypt the access token
            payment_model.square_access_token = result["access_token"]
            payment_model.square_account_verified = True

        db.commit()

        # Redirect to success page instead of returning JSON
        from fastapi.responses import RedirectResponse

        return RedirectResponse(
            url=f"http://localhost:3000/oauth-success.html?platform={platform}&success=true",
            status_code=302,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect account: {str(e)}",
        )


@router.put("/payment-model/{barber_id}")
async def update_payment_model(
    barber_id: int,
    update_data: PaymentModelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update barber's payment model (commission rates, booth rent, etc.)
    Only shop owner can do this
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can update payment models",
        )

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

    # Update fields
    payment_model.payment_type = update_data.payment_type
    payment_model.service_commission_rate = update_data.service_commission_rate / 100
    payment_model.product_commission_rate = update_data.product_commission_rate / 100
    payment_model.booth_rent_amount = update_data.booth_rent_amount
    payment_model.rent_frequency = update_data.rent_frequency

    db.commit()

    return {
        "success": True,
        "message": "Payment model updated",
        "commission_rate": update_data.service_commission_rate,
        "booth_rent": update_data.booth_rent_amount,
    }


@router.post("/process-payment")
async def process_split_payment(
    payment_data: PaymentSplitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process a payment that automatically splits between shop and barber
    Customer pays full amount, barber instantly receives their portion
    """
    # Get appointment and verify it exists
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == payment_data.appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Get barber's payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == appointment.barber_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has no active payment model",
        )

    # Check if barber has connected account
    if (
        not payment_model.stripe_connect_account_id
        and not payment_model.square_merchant_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not connected a payment account",
        )

    # Calculate split
    split_service = PaymentSplitService()
    split = split_service.calculate_split(
        total_amount=Decimal(str(payment_data.amount)),
        barber_payment_model={
            "payment_type": payment_model.payment_type.value,
            "service_commission_rate": payment_model.service_commission_rate,
        },
    )

    try:
        # Process payment based on platform
        if payment_model.stripe_connect_account_id:
            # Use Stripe
            result = split_service.create_stripe_payment_with_split(
                {
                    "amount": payment_data.amount,
                    "barber_amount": split["barber_amount"],
                    "barber_stripe_account_id": payment_model.stripe_connect_account_id,
                    "barber_id": appointment.barber_id,
                    "appointment_id": appointment.id,
                    "payment_method_id": payment_data.payment_method_id,
                    "customer_id": payment_data.customer_id,
                    "description": payment_data.description
                    or f"Service by {appointment.barber.user.first_name}",
                    "commission_rate": split["commission_rate"],
                }
            )

        elif payment_model.square_merchant_id:
            # Use Square
            result = split_service.create_square_payment_with_split(
                {
                    "amount": payment_data.amount,
                    "barber_amount": split["barber_amount"],
                    "barber_id": appointment.barber_id,
                    "appointment_id": appointment.id,
                    "source_id": payment_data.source_id,
                    "customer_id": payment_data.customer_id,
                    "location_id": os.getenv("SQUARE_LOCATION_ID"),
                    "description": payment_data.description
                    or f"Service by {appointment.barber.user.first_name}",
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment platform configured",
            )

        # Save payment record
        payment = Payment(
            appointment_id=appointment.id,
            amount=payment_data.amount,
            status="succeeded",
            payment_method="card",
            stripe_payment_intent_id=result.get("payment_intent_id"),
            metadata={
                "split": split,
                "platform": (
                    "stripe" if payment_model.stripe_connect_account_id else "square"
                ),
                "barber_received": split["barber_amount"],
                "shop_received": split["shop_amount"],
            },
        )
        db.add(payment)
        db.commit()

        return {
            "success": True,
            "payment_id": result.get("payment_intent_id") or result.get("payment_id"),
            "total_amount": payment_data.amount,
            "barber_received": split["barber_amount"],
            "shop_commission": split["shop_amount"],
            "commission_rate": f"{split['commission_rate'] * 100}%",
            "message": f"Payment processed! Barber instantly received ${split['barber_amount']:.2f}",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment failed: {str(e)}",
        )


@router.get("/connected-accounts")
async def list_connected_accounts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    List all barbers and their connected payment accounts
    Shop owner only
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Get all barbers with payment models
    barbers = (
        db.query(Barber)
        .join(BarberPaymentModel, Barber.id == BarberPaymentModel.barber_id)
        .filter(BarberPaymentModel.active == True)
        .all()
    )

    results = []
    for barber in barbers:
        payment_model = barber.payment_model[0] if barber.payment_model else None

        results.append(
            {
                "barber_id": barber.id,
                "barber_name": f"{barber.user.first_name} {barber.user.last_name}",
                "stripe_connected": bool(
                    payment_model and payment_model.stripe_connect_account_id
                ),
                "square_connected": bool(
                    payment_model and payment_model.square_merchant_id
                ),
                "payment_type": (
                    payment_model.payment_type.value if payment_model else None
                ),
                "commission_rate": (
                    f"{payment_model.service_commission_rate * 100}%"
                    if payment_model
                    else "0%"
                ),
                "booth_rent": payment_model.booth_rent_amount if payment_model else 0,
            }
        )

    return results


@router.post("/charge-booth-rent/{barber_id}")
async def charge_booth_rent(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Charge weekly/monthly booth rent from barber's connected account
    This is separate from service payments
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
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment model not found"
        )

    if payment_model.payment_type not in [
        PaymentModelType.BOOTH_RENT,
        PaymentModelType.HYBRID,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This barber is not on a booth rent model",
        )

    if payment_model.booth_rent_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No booth rent amount configured",
        )

    # Only Stripe supports direct charges for now
    if not payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booth rent can only be charged from Stripe accounts currently",
        )

    split_service = PaymentSplitService()

    try:
        result = split_service.process_booth_rent_charge(
            barber_stripe_account=payment_model.stripe_connect_account_id,
            rent_amount=Decimal(str(payment_model.booth_rent_amount)),
        )

        # Record booth rent payment
        from models.barber_payment import BoothRentPayment

        rent_payment = BoothRentPayment(
            payment_model_id=payment_model.id,
            barber_id=barber_id,
            amount_due=payment_model.booth_rent_amount,
            amount_paid=payment_model.booth_rent_amount,
            due_date=datetime.utcnow(),
            paid_date=datetime.utcnow(),
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow(),
            status="paid",
            payment_method="stripe_direct_charge",
            stripe_charge_id=result["charge_id"],
        )

        db.add(rent_payment)
        db.commit()

        return {
            "success": True,
            "charge_id": result["charge_id"],
            "amount": result["amount"],
            "message": f"Successfully charged ${result['amount']} booth rent",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to charge booth rent: {str(e)}",
        )


@router.get("/test-split-calculation")
async def test_split_calculation(db: Session = Depends(get_db)):
    """Test endpoint to verify split calculations"""
    from decimal import Decimal

    # Get the payment model for barber 1
    payment_model = (
        db.query(BarberPaymentModel).filter(BarberPaymentModel.barber_id == 1).first()
    )

    if not payment_model:
        return {"error": "No payment model found for barber 1"}

    # Test split calculations
    split_service = PaymentSplitService()
    test_amounts = [50, 100, 150, 200]
    results = []

    for amount in test_amounts:
        split = split_service.calculate_split(
            total_amount=Decimal(str(amount)),
            barber_payment_model={
                "payment_type": payment_model.payment_type.value,
                "service_commission_rate": payment_model.service_commission_rate,
            },
        )

        results.append(
            {
                "total": amount,
                "barber_gets": split["barber_amount"],
                "shop_gets": split["shop_amount"],
                "commission_rate": f"{split['commission_rate'] * 100}%",
            }
        )

    return {
        "stripe_account": payment_model.stripe_connect_account_id,
        "payment_type": payment_model.payment_type.value,
        "commission_rate": f"{payment_model.service_commission_rate * 100}%",
        "calculations": results,
        "ready_for_payments": bool(payment_model.stripe_connect_account_id),
    }


# Adapter endpoints for frontend compatibility
@router.get("/barbers")
async def get_barbers_payment_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all barbers with their payment model information"""
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view barber payment information",
        )
    
    barbers = db.query(Barber).filter(Barber.is_active == True).all()
    result = []
    
    for barber in barbers:
        payment_model = (
            db.query(BarberPaymentModel)
            .filter(BarberPaymentModel.barber_id == barber.id)
            .first()
        )
        
        result.append({
            "barber_id": barber.id,
            "barber_name": f"{barber.first_name} {barber.last_name}",
            "email": barber.email,
            "phone": barber.phone,
            "payment_type": payment_model.payment_type.value if payment_model else "commission",
            "commission_rate": payment_model.service_commission_rate if payment_model else 0.3,
            "booth_rent_amount": payment_model.booth_rent_amount if payment_model else 0,
            "booth_rent_frequency": payment_model.rent_frequency if payment_model else "weekly",
            "stripe_account_id": payment_model.stripe_connect_account_id if payment_model else None,
            "square_merchant_id": payment_model.square_merchant_id if payment_model else None,
            "stripe_connected": bool(payment_model.stripe_connect_account_id) if payment_model else False,
            "square_connected": bool(payment_model.square_merchant_id) if payment_model else False,
            "rentpedi_tenant_id": None,
            "rentpedi_connected": False,
            "created_at": barber.created_at.isoformat() if barber.created_at else None,
            "updated_at": barber.updated_at.isoformat() if barber.updated_at else None,
        })
    
    return result


@router.get("/recent")
async def get_recent_payment_splits(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent payment splits"""
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view financial data",
        )
    
    # Get recent payments with appointment info
    payments = (
        db.query(Payment)
        .join(Appointment)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )
    
    split_service = PaymentSplitService()
    result = []
    
    for payment in payments:
        if payment.appointment and payment.appointment.barber_id:
            barber = db.query(Barber).filter(Barber.id == payment.appointment.barber_id).first()
            payment_model = (
                db.query(BarberPaymentModel)
                .filter(BarberPaymentModel.barber_id == payment.appointment.barber_id)
                .first()
            )
            
            if barber and payment_model:
                split = split_service.calculate_split(
                    total_amount=payment.amount,
                    barber_payment_model={
                        "payment_type": payment_model.payment_type.value,
                        "service_commission_rate": payment_model.service_commission_rate,
                    },
                )
                
                result.append({
                    "id": payment.id,
                    "date": payment.created_at.isoformat(),
                    "appointment_id": payment.appointment_id,
                    "barber_name": f"{barber.first_name} {barber.last_name}",
                    "barber_id": barber.id,
                    "service": payment.appointment.service_name if payment.appointment else "Service",
                    "total_amount": float(payment.amount),
                    "barber_amount": float(split["barber_amount"]),
                    "shop_amount": float(split["shop_amount"]),
                    "commission_rate": float(split["commission_rate"]),
                    "payment_method": payment.payment_method or "card",
                    "status": "completed" if payment.status == "succeeded" else payment.status,
                })
    
    return result


@router.get("/commission-payments")
async def get_commission_payments(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get commission payments for the period"""
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view financial data",
        )
    
    # For now, calculate commissions from actual payments
    query = db.query(Payment).join(Appointment)
    
    if start_date:
        query = query.filter(Payment.created_at >= start_date)
    if end_date:
        query = query.filter(Payment.created_at <= end_date)
    
    payments = query.all()
    
    # Group by barber
    barber_commissions = {}
    split_service = PaymentSplitService()
    
    for payment in payments:
        if payment.appointment and payment.appointment.barber_id:
            barber_id = payment.appointment.barber_id
            
            if barber_id not in barber_commissions:
                barber = db.query(Barber).filter(Barber.id == barber_id).first()
                payment_model = (
                    db.query(BarberPaymentModel)
                    .filter(BarberPaymentModel.barber_id == barber_id)
                    .first()
                )
                
                if barber:
                    barber_commissions[barber_id] = {
                        "barber_id": barber_id,
                        "barber_name": f"{barber.first_name} {barber.last_name}",
                        "total_revenue": 0,
                        "total_commission": 0,
                        "payment_count": 0,
                        "commission_rate": payment_model.service_commission_rate if payment_model else 0.3,
                        "status": "pending",
                    }
            
            if barber_id in barber_commissions:
                payment_model = (
                    db.query(BarberPaymentModel)
                    .filter(BarberPaymentModel.barber_id == barber_id)
                    .first()
                )
                
                split = split_service.calculate_split(
                    total_amount=payment.amount,
                    barber_payment_model={
                        "payment_type": payment_model.payment_type.value if payment_model else "commission",
                        "service_commission_rate": payment_model.service_commission_rate if payment_model else 0.3,
                    },
                )
                
                barber_commissions[barber_id]["total_revenue"] += float(payment.amount)
                barber_commissions[barber_id]["total_commission"] += float(split["shop_amount"])
                barber_commissions[barber_id]["payment_count"] += 1
    
    return list(barber_commissions.values())


@router.get("/booth-rent")
async def get_booth_rent_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get booth rent payment status"""
    # Check permissions
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_REVENUE_DATA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view financial data",
        )
    
    # Get all barbers with booth rent payment model
    booth_rent_barbers = (
        db.query(Barber)
        .join(BarberPaymentModel)
        .filter(BarberPaymentModel.payment_type == PaymentModelType.BOOTH_RENT)
        .all()
    )
    
    result = []
    for barber in booth_rent_barbers:
        payment_model = (
            db.query(BarberPaymentModel)
            .filter(BarberPaymentModel.barber_id == barber.id)
            .first()
        )
        
        if payment_model:
            # Calculate next due date based on frequency
            from datetime import date
            today = date.today()
            
            # Simple calculation - would need to be more sophisticated in production
            if payment_model.rent_frequency == "weekly":
                days_until_due = (payment_model.rent_due_day - today.weekday()) % 7
            else:  # monthly
                days_until_due = payment_model.rent_due_day - today.day
                if days_until_due < 0:
                    days_until_due += 30
            
            result.append({
                "barber_id": barber.id,
                "barber_name": f"{barber.first_name} {barber.last_name}",
                "rent_amount": float(payment_model.booth_rent_amount),
                "frequency": payment_model.rent_frequency,
                "due_date": (today + timedelta(days=days_until_due)).isoformat(),
                "status": "current" if days_until_due > 0 else "due",
                "auto_collect": payment_model.auto_collect_rent,
            })
    
    return result


# Include in main router
def include_router(app):
    app.include_router(router, prefix="/api/v1/payment-splits", tags=["payment-splits"])
