"""
Square OAuth API Endpoints - Complete implementation for Square OAuth and payment management
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import json

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
    BackgroundTasks,
    Request,
    Response,
    Header,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator

from config.database import get_db
from models.barber import Barber
from models.user import User
from models.square_payment import (
    SquareAccount,
    SquarePayment,
    SquarePayout,
    SquarePaymentStatus,
    SquarePayoutStatus,
)
from models.appointment import Appointment
from api.v1.auth import get_current_user
from services.rbac_service import RBACService, Permission
from services.square_oauth_service import square_oauth_service


router = APIRouter()


# Pydantic Models
class SquareOAuthInitiate(BaseModel):
    barber_id: Optional[int] = None
    redirect_uri: Optional[str] = None
    additional_scopes: Optional[List[str]] = []


class SquareOAuthCallback(BaseModel):
    code: str
    state: str
    redirect_uri: Optional[str] = None


class SquareAccountStatus(BaseModel):
    connected: bool
    verified: Optional[bool] = None
    can_receive_payments: Optional[bool] = None
    can_make_payouts: Optional[bool] = None
    merchant_name: Optional[str] = None
    locations_count: Optional[int] = None
    bank_accounts_count: Optional[int] = None
    last_sync: Optional[str] = None
    error: Optional[str] = None


class SquarePaymentCreate(BaseModel):
    appointment_id: int
    amount_cents: int = Field(..., gt=0, description="Amount in cents")
    source_id: str = Field(..., description="Payment source nonce from Square SDK")
    location_id: str
    customer_email: Optional[str] = None
    customer_id: Optional[str] = None
    auto_complete: bool = True

    @validator("amount_cents")
    def validate_amount(cls, v):
        if v < 50:  # Square minimum is $0.50
            raise ValueError("Amount must be at least 50 cents")
        return v


class SquarePaymentResponse(BaseModel):
    id: int
    square_payment_id: str
    amount: float
    currency: str
    status: str
    appointment_id: int
    barber_id: int
    receipt_url: Optional[str]
    card_brand: Optional[str]
    card_last_four: Optional[str]
    created_at: datetime
    payout: Optional[Dict[str, Any]] = None


class SquarePayoutResponse(BaseModel):
    id: int
    square_payout_id: Optional[str]
    amount: float
    currency: str
    status: str
    payment_id: int
    barber_id: int
    scheduled_at: Optional[datetime]
    paid_at: Optional[datetime]
    description: str
    commission_rate: float
    platform_fee: float
    processing_fee: float
    net_amount: float


class PaymentHistoryQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    limit: int = Field(100, le=500)
    offset: int = Field(0, ge=0)


class PayoutHistoryQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[SquarePayoutStatus] = None
    limit: int = Field(100, le=500)
    offset: int = Field(0, ge=0)


class WebhookEvent(BaseModel):
    merchant_id: str
    type: str
    event_id: str
    created_at: str
    data: Dict[str, Any]


class ManualPayoutRequest(BaseModel):
    payment_ids: List[int]
    description: Optional[str] = None


# OAuth Endpoints
@router.post("/oauth/initiate", status_code=status.HTTP_200_OK)
async def initiate_square_oauth(
    request: SquareOAuthInitiate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initiate Square OAuth flow"""
    rbac = RBACService(db)

    # Determine barber_id
    barber_id = request.barber_id
    if not barber_id:
        # Check if current user is a barber
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            barber_id = barber.id
        else:
            # Admin must specify barber_id
            if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="barber_id must be specified for admin users",
            )
    else:
        # Verify permissions if barber_id specified
        if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
            # Non-admin can only connect their own account
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or barber.id != barber_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot connect Square account for other barbers",
                )

    # Generate OAuth URL
    oauth_url = square_oauth_service.get_oauth_url(
        barber_id=barber_id,
        redirect_uri=request.redirect_uri,
        additional_scopes=request.additional_scopes,
    )

    return {
        "oauth_url": oauth_url,
        "barber_id": barber_id,
        "message": "Redirect user to the oauth_url to complete Square authorization",
    }


@router.post("/oauth/callback", status_code=status.HTTP_201_CREATED)
async def handle_square_oauth_callback(
    callback: SquareOAuthCallback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Handle Square OAuth callback"""
    try:
        # Exchange code for tokens
        tokens = await square_oauth_service.exchange_code_for_tokens(
            authorization_code=callback.code,
            state=callback.state,
            redirect_uri=callback.redirect_uri,
        )

        # Get merchant info
        merchant_info = await square_oauth_service.get_merchant_info(
            access_token=tokens["access_token"]
        )

        # Create or update Square account
        barber_id = tokens["barber_id"]
        square_account = await square_oauth_service.create_or_update_square_account(
            db=db, barber_id=barber_id, tokens=tokens, merchant_info=merchant_info
        )

        return {
            "success": True,
            "message": "Square account successfully connected",
            "account": {
                "id": square_account.id,
                "barber_id": square_account.barber_id,
                "merchant_id": square_account.square_merchant_id,
                "merchant_name": square_account.merchant_name,
                "is_verified": square_account.is_verified,
                "can_receive_payments": square_account.can_receive_payments,
                "can_make_payouts": square_account.can_make_payouts,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete Square OAuth: {str(e)}",
        )


@router.get("/account/status", response_model=SquareAccountStatus)
async def get_square_account_status(
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check Square account status and capabilities"""
    rbac = RBACService(db)

    # Determine barber_id
    if not barber_id:
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            barber_id = barber.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="barber_id required for non-barber users",
            )
    else:
        # Verify permissions
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or barber.id != barber_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )

    status = await square_oauth_service.check_account_status(db, barber_id)
    return SquareAccountStatus(**status)


@router.post("/account/disconnect", status_code=status.HTTP_200_OK)
async def disconnect_square_account(
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect Square account"""
    rbac = RBACService(db)

    # Determine barber_id
    if not barber_id:
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if barber:
            barber_id = barber.id
        else:
            if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="barber_id required for admin users",
            )
    else:
        # Verify permissions
        if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or barber.id != barber_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot disconnect Square account for other barbers",
                )

    success = await square_oauth_service.disconnect_account(db, barber_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Square account not found"
        )

    return {"success": True, "message": "Square account disconnected successfully"}


# Payment Endpoints
@router.post("/payments", response_model=SquarePaymentResponse)
async def create_square_payment(
    payment: SquarePaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Square payment with automatic commission split"""
    rbac = RBACService(db)

    # Verify appointment exists and user has permission
    appointment = (
        db.query(Appointment).filter(Appointment.id == payment.appointment_id).first()
    )

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.PROCESS_PAYMENTS):
        # Check if user is the barber for this appointment
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or appointment.barber_id != barber.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Prepare customer info
    customer_info = {}
    if payment.customer_email:
        customer_info["email"] = payment.customer_email
    if payment.customer_id:
        customer_info["customer_id"] = payment.customer_id

    try:
        # Create payment
        square_payment = await square_oauth_service.create_payment_with_split(
            db=db,
            appointment_id=payment.appointment_id,
            amount_cents=payment.amount_cents,
            source_id=payment.source_id,
            location_id=payment.location_id,
            customer_info=customer_info if customer_info else None,
            auto_complete=payment.auto_complete,
        )

        # Get associated payout if created
        payout = (
            db.query(SquarePayout)
            .filter(SquarePayout.payment_id == square_payment.id)
            .first()
        )

        response = SquarePaymentResponse(
            id=square_payment.id,
            square_payment_id=square_payment.square_payment_id,
            amount=float(square_payment.total_money),
            currency=square_payment.currency,
            status=square_payment.status,
            appointment_id=square_payment.appointment_id,
            barber_id=square_payment.barber_id,
            receipt_url=square_payment.square_receipt_url,
            card_brand=square_payment.card_brand,
            card_last_four=square_payment.card_last_four,
            created_at=square_payment.created_at,
        )

        if payout:
            response.payout = {
                "id": payout.id,
                "amount": float(payout.net_amount),
                "status": payout.status,
                "scheduled_at": (
                    payout.scheduled_at.isoformat() if payout.scheduled_at else None
                ),
            }

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment: {str(e)}",
        )


@router.get("/payments/{payment_id}", response_model=SquarePaymentResponse)
async def get_square_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific Square payment"""
    rbac = RBACService(db)

    payment = db.query(SquarePayment).filter(SquarePayment.id == payment_id).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )

    # Check permissions
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
        if not barber or payment.barber_id != barber.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
            )

    # Get associated payout
    payout = (
        db.query(SquarePayout).filter(SquarePayout.payment_id == payment.id).first()
    )

    response = SquarePaymentResponse(
        id=payment.id,
        square_payment_id=payment.square_payment_id,
        amount=float(payment.total_money),
        currency=payment.currency,
        status=payment.status,
        appointment_id=payment.appointment_id,
        barber_id=payment.barber_id,
        receipt_url=payment.square_receipt_url,
        card_brand=payment.card_brand,
        card_last_four=payment.card_last_four,
        created_at=payment.created_at,
    )

    if payout:
        response.payout = {
            "id": payout.id,
            "amount": float(payout.net_amount),
            "status": payout.status,
            "scheduled_at": (
                payout.scheduled_at.isoformat() if payout.scheduled_at else None
            ),
            "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
        }

    return response


@router.get("/payments", response_model=List[SquarePaymentResponse])
async def list_square_payments(
    query_params: PaymentHistoryQuery = Depends(),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List Square payments with filtering"""
    rbac = RBACService(db)

    # Build query
    query = db.query(SquarePayment)

    # Apply barber filter
    if barber_id:
        # Check permissions
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or barber.id != barber_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )
        query = query.filter(SquarePayment.barber_id == barber_id)
    else:
        # If no barber_id specified, check if user is a barber
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                query = query.filter(SquarePayment.barber_id == barber.id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )

    # Apply filters
    if query_params.start_date:
        query = query.filter(SquarePayment.created_at >= query_params.start_date)
    if query_params.end_date:
        query = query.filter(SquarePayment.created_at <= query_params.end_date)
    if query_params.status:
        query = query.filter(SquarePayment.status == query_params.status)

    # Apply pagination
    payments = (
        query.order_by(SquarePayment.created_at.desc())
        .offset(query_params.offset)
        .limit(query_params.limit)
        .all()
    )

    # Get associated payouts
    payment_ids = [p.id for p in payments]
    payouts = (
        db.query(SquarePayout).filter(SquarePayout.payment_id.in_(payment_ids)).all()
        if payment_ids
        else []
    )

    payout_map = {p.payment_id: p for p in payouts}

    results = []
    for payment in payments:
        response = SquarePaymentResponse(
            id=payment.id,
            square_payment_id=payment.square_payment_id,
            amount=float(payment.total_money),
            currency=payment.currency,
            status=payment.status,
            appointment_id=payment.appointment_id,
            barber_id=payment.barber_id,
            receipt_url=payment.square_receipt_url,
            card_brand=payment.card_brand,
            card_last_four=payment.card_last_four,
            created_at=payment.created_at,
        )

        payout = payout_map.get(payment.id)
        if payout:
            response.payout = {
                "id": payout.id,
                "amount": float(payout.net_amount),
                "status": payout.status,
                "scheduled_at": (
                    payout.scheduled_at.isoformat() if payout.scheduled_at else None
                ),
            }

        results.append(response)

    return results


# Payout Endpoints
@router.post("/payouts/process-scheduled", status_code=status.HTTP_200_OK)
async def process_scheduled_payouts(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process all scheduled Square payouts"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Add background task
    background_tasks.add_task(square_oauth_service.process_scheduled_payouts, db)

    return {"success": True, "message": "Payout processing started in background"}


@router.post("/payouts/{payout_id}/process", response_model=SquarePayoutResponse)
async def process_single_payout(
    payout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process a single Square payout"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    try:
        payout = await square_oauth_service.process_single_payout(db, payout_id)

        return SquarePayoutResponse(
            id=payout.id,
            square_payout_id=payout.square_payout_id,
            amount=float(payout.amount_money),
            currency=payout.currency,
            status=payout.status,
            payment_id=payout.payment_id,
            barber_id=payout.barber_id,
            scheduled_at=payout.scheduled_at,
            paid_at=payout.paid_at,
            description=payout.description,
            commission_rate=float(payout.commission_rate),
            platform_fee=float(payout.platform_fee),
            processing_fee=float(payout.processing_fee),
            net_amount=float(payout.net_amount),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process payout: {str(e)}",
        )


@router.post("/payouts/manual", response_model=List[SquarePayoutResponse])
async def create_manual_payouts(
    request: ManualPayoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create manual payouts for specific payments"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    created_payouts = []

    for payment_id in request.payment_ids:
        # Get payment
        payment = db.query(SquarePayment).filter(SquarePayment.id == payment_id).first()

        if not payment:
            continue

        # Check if payout already exists
        existing_payout = (
            db.query(SquarePayout).filter(SquarePayout.payment_id == payment_id).first()
        )

        if existing_payout:
            continue

        # Get payment model for commission
        from models.barber_payment import BarberPaymentModel

        payment_model = (
            db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.barber_id == payment.barber_id,
                BarberPaymentModel.active == True,
            )
            .first()
        )

        if not payment_model:
            continue

        # Calculate amounts
        commission_rate = float(payment_model.service_commission_rate)
        barber_amount = float(payment.total_money) * commission_rate
        platform_amount = float(payment.total_money) - barber_amount
        processing_fee = float(payment.processing_fee_money or 0)
        net_amount = barber_amount - processing_fee

        # Create payout
        payout = SquarePayout(
            payment_id=payment.id,
            square_account_id=payment.barber.square_account.id,
            barber_id=payment.barber_id,
            amount_money=Decimal(str(barber_amount)),
            currency="USD",
            status=SquarePayoutStatus.PENDING,
            original_amount=payment.total_money,
            commission_rate=Decimal(str(commission_rate)),
            commission_amount=Decimal(str(barber_amount)),
            platform_fee=Decimal(str(platform_amount)),
            processing_fee=Decimal(str(processing_fee)),
            net_amount=Decimal(str(net_amount)),
            description=request.description
            or f"Manual payout for payment {payment.square_payment_id}",
            reference_id=f"manual-{payment.square_payment_id}",
            scheduled_at=datetime.utcnow() + timedelta(days=1),
        )

        db.add(payout)
        created_payouts.append(payout)

    db.commit()

    return [
        SquarePayoutResponse(
            id=payout.id,
            square_payout_id=payout.square_payout_id,
            amount=float(payout.amount_money),
            currency=payout.currency,
            status=payout.status,
            payment_id=payout.payment_id,
            barber_id=payout.barber_id,
            scheduled_at=payout.scheduled_at,
            paid_at=payout.paid_at,
            description=payout.description,
            commission_rate=float(payout.commission_rate),
            platform_fee=float(payout.platform_fee),
            processing_fee=float(payout.processing_fee),
            net_amount=float(payout.net_amount),
        )
        for payout in created_payouts
    ]


@router.get("/payouts", response_model=List[SquarePayoutResponse])
async def list_square_payouts(
    query_params: PayoutHistoryQuery = Depends(),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List Square payouts with filtering"""
    rbac = RBACService(db)

    # Build query
    query = db.query(SquarePayout)

    # Apply barber filter
    if barber_id:
        # Check permissions
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or barber.id != barber_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )
        query = query.filter(SquarePayout.barber_id == barber_id)
    else:
        # If no barber_id specified, check if user is a barber
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                query = query.filter(SquarePayout.barber_id == barber.id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )

    # Apply filters
    if query_params.start_date:
        query = query.filter(SquarePayout.created_at >= query_params.start_date)
    if query_params.end_date:
        query = query.filter(SquarePayout.created_at <= query_params.end_date)
    if query_params.status:
        query = query.filter(SquarePayout.status == query_params.status)

    # Apply pagination
    payouts = (
        query.order_by(SquarePayout.created_at.desc())
        .offset(query_params.offset)
        .limit(query_params.limit)
        .all()
    )

    return [
        SquarePayoutResponse(
            id=payout.id,
            square_payout_id=payout.square_payout_id,
            amount=float(payout.amount_money),
            currency=payout.currency,
            status=payout.status,
            payment_id=payout.payment_id,
            barber_id=payout.barber_id,
            scheduled_at=payout.scheduled_at,
            paid_at=payout.paid_at,
            description=payout.description,
            commission_rate=float(payout.commission_rate),
            platform_fee=float(payout.platform_fee),
            processing_fee=float(payout.processing_fee),
            net_amount=float(payout.net_amount),
        )
        for payout in payouts
    ]


# Webhook Endpoint
@router.post("/webhooks", include_in_schema=False)
async def handle_square_webhook(
    request: Request,
    x_square_hmacsha256_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    """Handle Square webhook events"""
    # Get raw body
    body = await request.body()
    body_str = body.decode("utf-8")

    # Parse webhook data
    try:
        webhook_data = json.loads(body_str)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON in request body",
        )

    # Process webhook
    try:
        success = await square_oauth_service.handle_webhook(
            db, webhook_data, x_square_hmacsha256_signature or ""
        )

        if success:
            return {"status": "ok"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process webhook",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing error: {str(e)}",
        )


# Analytics Endpoints
@router.get("/analytics/summary")
async def get_square_analytics_summary(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    barber_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Square payment and payout analytics summary"""
    rbac = RBACService(db)

    # Build payment query
    payment_query = db.query(SquarePayment).filter(
        SquarePayment.created_at >= start_date, SquarePayment.created_at <= end_date
    )

    # Build payout query
    payout_query = db.query(SquarePayout).filter(
        SquarePayout.created_at >= start_date, SquarePayout.created_at <= end_date
    )

    # Apply barber filter
    if barber_id:
        # Check permissions
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if not barber or barber.id != barber_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )
        payment_query = payment_query.filter(SquarePayment.barber_id == barber_id)
        payout_query = payout_query.filter(SquarePayout.barber_id == barber_id)
    else:
        # If no barber_id specified, check if user is a barber
        if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
            barber = db.query(Barber).filter(Barber.user_id == current_user.id).first()
            if barber:
                payment_query = payment_query.filter(
                    SquarePayment.barber_id == barber.id
                )
                payout_query = payout_query.filter(SquarePayout.barber_id == barber.id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
                )

    payments = payment_query.all()
    payouts = payout_query.all()

    # Calculate payment stats
    total_payments = len(payments)
    total_payment_amount = sum(float(p.total_money) for p in payments)
    completed_payments = [p for p in payments if p.status == "completed"]
    failed_payments = [p for p in payments if p.status == "failed"]

    # Calculate payout stats
    total_payouts = len(payouts)
    total_payout_amount = sum(float(p.net_amount) for p in payouts)
    pending_payouts = [p for p in payouts if p.status == SquarePayoutStatus.PENDING]
    paid_payouts = [p for p in payouts if p.status == SquarePayoutStatus.PAID]
    failed_payouts = [p for p in payouts if p.status == SquarePayoutStatus.FAILED]

    # Calculate fees
    total_processing_fees = sum(float(p.processing_fee_money or 0) for p in payments)
    total_platform_fees = sum(float(p.platform_fee) for p in payouts)

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "payments": {
            "total_count": total_payments,
            "total_amount": total_payment_amount,
            "completed_count": len(completed_payments),
            "completed_amount": sum(float(p.total_money) for p in completed_payments),
            "failed_count": len(failed_payments),
            "average_payment": (
                total_payment_amount / total_payments if total_payments > 0 else 0
            ),
        },
        "payouts": {
            "total_count": total_payouts,
            "total_amount": total_payout_amount,
            "pending_count": len(pending_payouts),
            "pending_amount": sum(float(p.net_amount) for p in pending_payouts),
            "paid_count": len(paid_payouts),
            "paid_amount": sum(float(p.net_amount) for p in paid_payouts),
            "failed_count": len(failed_payouts),
        },
        "fees": {
            "total_processing_fees": total_processing_fees,
            "total_platform_fees": total_platform_fees,
            "total_fees": total_processing_fees + total_platform_fees,
        },
        "net_revenue": total_payment_amount
        - total_payout_amount
        - total_processing_fees,
    }


# Health Check
@router.get("/health", status_code=status.HTTP_200_OK)
async def square_health_check(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Check Square integration health"""
    rbac = RBACService(db)

    if not rbac.has_permission(current_user, Permission.MANAGE_PAYMENTS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Count active Square accounts
    active_accounts = (
        db.query(SquareAccount).filter(SquareAccount.is_active == True).count()
    )

    # Count recent payments
    recent_payments = (
        db.query(SquarePayment)
        .filter(SquarePayment.created_at >= datetime.utcnow() - timedelta(days=1))
        .count()
    )

    # Count pending payouts
    pending_payouts = (
        db.query(SquarePayout)
        .filter(SquarePayout.status == SquarePayoutStatus.PENDING)
        .count()
    )

    return {
        "status": "healthy",
        "active_accounts": active_accounts,
        "recent_payments_24h": recent_payments,
        "pending_payouts": pending_payouts,
        "timestamp": datetime.utcnow().isoformat(),
    }


# Include in main router
def include_router(app):
    app.include_router(router, prefix="/api/v1/square", tags=["square-oauth"])
