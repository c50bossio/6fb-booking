"""
Stripe Connect OAuth - Let barbers connect their existing Stripe accounts
Much simpler than creating new accounts!
"""

from typing import Optional
from datetime import datetime
import secrets
import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config.database import get_db
from models.barber import Barber
from models.barber_payment import BarberPaymentModel, PaymentModelType
from api.v1.auth import get_current_user
from models.user import User
from services.rbac_service import RBACService, Permission
from services.stripe_connect_service import StripeConnectService


router = APIRouter()


# Pydantic Models
class StripeConnectResponse(BaseModel):
    connect_url: str
    state_token: str


class StripeOAuthCallback(BaseModel):
    code: str
    state: str


class ConnectedAccountInfo(BaseModel):
    connected: bool
    stripe_account_id: Optional[str]
    payouts_enabled: bool
    dashboard_url: Optional[str]


# API Endpoints
@router.get("/connect/{barber_id}", response_model=StripeConnectResponse)
async def start_stripe_connect(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 1: Generate Stripe OAuth URL for barber to connect their existing account
    They just click, authorize, and they're done!
    """
    # Check permissions - barbers can connect their own accounts
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

    # Check if already connected
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if payment_model and payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe account already connected",
        )

    # Generate secure state token
    state_token = secrets.token_urlsafe(32)

    # Store state token in session or cache with barber_id
    # In production, store this in Redis or session storage
    # For now, we'll include barber_id in state
    state = f"{barber_id}:{state_token}"

    # Create OAuth URL
    stripe_service = StripeConnectService()
    connect_url = stripe_service.create_oauth_link(state)

    return StripeConnectResponse(connect_url=connect_url, state_token=state)


@router.post("/callback", response_model=dict)
async def handle_stripe_callback(
    callback_data: StripeOAuthCallback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 2: Handle OAuth callback after barber authorizes connection
    This completes the connection and saves their Stripe account ID
    """
    # Parse state to get barber_id
    try:
        barber_id, state_token = callback_data.state.split(":")
        barber_id = int(barber_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state parameter"
        )

    # Verify barber exists
    barber = db.query(Barber).filter(Barber.id == barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    # Complete OAuth connection
    stripe_service = StripeConnectService()

    try:
        connection_result = stripe_service.complete_oauth_connection(callback_data.code)

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
            payment_model.stripe_connect_account_id = connection_result[
                "stripe_user_id"
            ]
            payment_model.stripe_payouts_enabled = True
            payment_model.stripe_onboarding_completed = True
        else:
            payment_model = BarberPaymentModel(
                barber_id=barber_id,
                payment_type=PaymentModelType.COMMISSION,
                service_commission_rate=0.30,  # Default 30%
                product_commission_rate=0.15,  # Default 15%
                stripe_connect_account_id=connection_result["stripe_user_id"],
                stripe_payouts_enabled=True,
                stripe_onboarding_completed=True,
                active=True,
            )
            db.add(payment_model)

        db.commit()

        return {
            "success": True,
            "message": "Stripe account connected successfully!",
            "stripe_account_id": connection_result["stripe_user_id"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Stripe account: {str(e)}",
        )


@router.get("/status/{barber_id}", response_model=ConnectedAccountInfo)
async def get_connection_status(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if barber has connected their Stripe account"""
    # Check permissions
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

    # Get payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model or not payment_model.stripe_connect_account_id:
        return ConnectedAccountInfo(
            connected=False,
            stripe_account_id=None,
            payouts_enabled=False,
            dashboard_url=None,
        )

    # Get dashboard link
    stripe_service = StripeConnectService()
    try:
        dashboard_url = stripe_service.create_login_link(
            payment_model.stripe_connect_account_id
        )
    except:
        dashboard_url = None

    return ConnectedAccountInfo(
        connected=True,
        stripe_account_id=payment_model.stripe_connect_account_id,
        payouts_enabled=payment_model.stripe_payouts_enabled,
        dashboard_url=dashboard_url,
    )


@router.post("/disconnect/{barber_id}")
async def disconnect_stripe_account(
    barber_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect barber's Stripe account"""
    # Check permissions
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

    # Get payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id, BarberPaymentModel.active == True
        )
        .first()
    )

    if not payment_model or not payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe account connected",
        )

    # Disconnect from Stripe
    stripe_service = StripeConnectService()
    try:
        stripe_service.disconnect_account(payment_model.stripe_connect_account_id)

        # Update payment model
        payment_model.stripe_connect_account_id = None
        payment_model.stripe_payouts_enabled = False
        payment_model.stripe_onboarding_completed = False

        db.commit()

        return {"success": True, "message": "Stripe account disconnected"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect: {str(e)}",
        )


# Include in main router
def include_router(app):
    app.include_router(router, prefix="/api/v1/stripe-connect", tags=["stripe-connect"])
