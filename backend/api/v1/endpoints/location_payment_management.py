"""
Multi-Location Payment Management System
Each location can have barbers connect their own payment accounts
Supports both Stripe and Square per location
"""

from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from config.database import get_db
from models.location import Location
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
class LocationPaymentSetup(BaseModel):
    location_id: int
    payment_platform: str  # 'stripe', 'square', or 'both'
    stripe_account_id: Optional[str] = None  # Location's Stripe account
    square_location_id: Optional[str] = None  # Location's Square ID
    default_commission_rate: float = 30.0  # Default 30% for new barbers


class BarberLocationAssignment(BaseModel):
    barber_id: int
    location_id: int
    commission_rate: Optional[float] = None  # Override location default
    booth_rent: Optional[float] = 0.0
    payment_type: PaymentModelType = PaymentModelType.COMMISSION


class BarberPaymentConnection(BaseModel):
    barber_id: int
    location_id: int
    platform: str  # 'stripe' or 'square'


class LocationPaymentSummary(BaseModel):
    location_id: int
    location_name: str
    total_barbers: int
    connected_barbers: int
    stripe_connected: int
    square_connected: int
    total_revenue: float
    total_commissions: float


# API Endpoints
@router.post("/locations/setup")
async def setup_location_payments(
    setup: LocationPaymentSetup,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set up payment configuration for a specific location
    Each location can have its own payment settings
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_LOCATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owner can configure location payments",
        )

    # Verify location exists
    location = db.query(Location).filter(Location.id == setup.location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    # Update location payment settings
    location.payment_platform = setup.payment_platform
    location.stripe_account_id = setup.stripe_account_id
    location.square_location_id = setup.square_location_id
    location.default_commission_rate = setup.default_commission_rate / 100

    db.commit()

    return {
        "success": True,
        "location": location.name,
        "payment_platform": setup.payment_platform,
        "default_commission": f"{setup.default_commission_rate}%",
    }


@router.post("/barbers/assign-location")
async def assign_barber_to_location(
    assignment: BarberLocationAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assign a barber to a specific location with payment terms
    Each barber can work at multiple locations with different terms
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    # Verify barber and location exist
    barber = db.query(Barber).filter(Barber.id == assignment.barber_id).first()
    location = db.query(Location).filter(Location.id == assignment.location_id).first()

    if not barber or not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber or location not found"
        )

    # Create or update payment model for this barber-location combination
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == assignment.barber_id,
            BarberPaymentModel.location_id == assignment.location_id,
        )
        .first()
    )

    commission_rate = assignment.commission_rate or location.default_commission_rate

    if payment_model:
        # Update existing
        payment_model.payment_type = assignment.payment_type
        payment_model.service_commission_rate = commission_rate / 100
        payment_model.booth_rent_amount = assignment.booth_rent
        payment_model.active = True
    else:
        # Create new
        payment_model = BarberPaymentModel(
            barber_id=assignment.barber_id,
            location_id=assignment.location_id,
            payment_type=assignment.payment_type,
            service_commission_rate=commission_rate / 100,
            product_commission_rate=0.15,  # Default 15% on products
            booth_rent_amount=assignment.booth_rent,
            rent_frequency="weekly",
            active=True,
        )
        db.add(payment_model)

    # Add barber to location if not already there
    if location not in barber.locations:
        barber.locations.append(location)

    db.commit()

    return {
        "success": True,
        "barber": f"{barber.user.first_name} {barber.user.last_name}",
        "location": location.name,
        "commission_rate": f"{commission_rate}%",
        "payment_type": assignment.payment_type.value,
    }


@router.post("/barbers/connect-payment")
async def connect_barber_payment(
    connection: BarberPaymentConnection,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate OAuth link for barber to connect their payment account
    Specific to a location - barber can have different accounts per location
    """
    # Verify barber can connect their own account
    barber = db.query(Barber).filter(Barber.id == connection.barber_id).first()
    if not barber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Barber not found"
        )

    if barber.user_id != current_user.id:
        rbac = RBACService(db)
        if not rbac.has_permission(current_user, Permission.MANAGE_BARBERS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only connect your own payment account",
            )

    # Verify barber is assigned to this location
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == connection.barber_id,
            BarberPaymentModel.location_id == connection.location_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber not assigned to this location",
        )

    # Check if already connected
    if connection.platform == "stripe" and payment_model.stripe_connect_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe account already connected for this location",
        )
    elif connection.platform == "square" and payment_model.square_merchant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Square account already connected for this location",
        )

    # Generate OAuth URL
    state_token = secrets.token_urlsafe(32)
    state = f"{connection.barber_id}:{connection.location_id}:{state_token}"

    split_service = PaymentSplitService()

    if connection.platform == "stripe":
        oauth_url = split_service.create_stripe_connect_oauth_url(
            barber_id=connection.barber_id, state=state
        )
    elif connection.platform == "square":
        oauth_url = split_service.create_square_oauth_url(
            barber_id=connection.barber_id, state=state
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform must be 'stripe' or 'square'",
        )

    return {
        "oauth_url": oauth_url,
        "platform": connection.platform,
        "location_id": connection.location_id,
        "message": f"Click the link to connect your {connection.platform.title()} account for this location",
    }


@router.get("/locations/{location_id}/barbers")
async def get_location_barbers(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all barbers assigned to a location and their payment status
    """
    # Verify location exists
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )

    # Get all barbers at this location
    payment_models = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.location_id == location_id,
            BarberPaymentModel.active == True,
        )
        .all()
    )

    barbers = []
    for pm in payment_models:
        barber = pm.barber

        barbers.append(
            {
                "barber_id": barber.id,
                "name": f"{barber.user.first_name} {barber.user.last_name}",
                "email": barber.user.email,
                "payment_type": pm.payment_type.value,
                "commission_rate": f"{pm.service_commission_rate * 100}%",
                "booth_rent": pm.booth_rent_amount if pm.booth_rent_amount else None,
                "stripe_connected": bool(pm.stripe_connect_account_id),
                "square_connected": bool(pm.square_merchant_id),
                "can_receive_payments": bool(
                    pm.stripe_connect_account_id or pm.square_merchant_id
                ),
            }
        )

    return {
        "location": location.name,
        "total_barbers": len(barbers),
        "connected_barbers": sum(1 for b in barbers if b["can_receive_payments"]),
        "barbers": barbers,
    }


@router.get("/locations/summary")
async def get_all_locations_summary(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> List[LocationPaymentSummary]:
    """
    Get payment summary for all locations
    Shows barber connections and revenue per location
    """
    rbac = RBACService(db)
    if not rbac.has_permission(current_user, Permission.VIEW_ALL_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )

    locations = db.query(Location).all()
    summaries = []

    for location in locations:
        # Count barbers
        payment_models = (
            db.query(BarberPaymentModel)
            .filter(
                BarberPaymentModel.location_id == location.id,
                BarberPaymentModel.active == True,
            )
            .all()
        )

        total_barbers = len(payment_models)
        stripe_connected = sum(
            1 for pm in payment_models if pm.stripe_connect_account_id
        )
        square_connected = sum(1 for pm in payment_models if pm.square_merchant_id)
        connected_barbers = sum(
            1
            for pm in payment_models
            if pm.stripe_connect_account_id or pm.square_merchant_id
        )

        # Calculate revenue (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        total_revenue = (
            db.query(func.sum(Payment.amount))
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .filter(
                Appointment.location_id == location.id,
                Payment.status == "succeeded",
                Payment.created_at >= thirty_days_ago,
            )
            .scalar()
            or 0
        )

        # Calculate commissions kept
        total_commissions = 0
        for pm in payment_models:
            barber_revenue = (
                db.query(func.sum(Payment.amount))
                .join(Appointment, Payment.appointment_id == Appointment.id)
                .filter(
                    Appointment.barber_id == pm.barber_id,
                    Appointment.location_id == location.id,
                    Payment.status == "succeeded",
                    Payment.created_at >= thirty_days_ago,
                )
                .scalar()
                or 0
            )

            total_commissions += float(barber_revenue) * pm.service_commission_rate

        summaries.append(
            LocationPaymentSummary(
                location_id=location.id,
                location_name=location.name,
                total_barbers=total_barbers,
                connected_barbers=connected_barbers,
                stripe_connected=stripe_connected,
                square_connected=square_connected,
                total_revenue=float(total_revenue),
                total_commissions=total_commissions,
            )
        )

    return summaries


@router.post("/process-location-payment")
async def process_payment_for_location(
    appointment_id: int,
    payment_method_id: Optional[str] = None,  # Stripe
    source_id: Optional[str] = None,  # Square
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process a payment that automatically splits based on location settings
    Customer pays full amount, barber receives their portion instantly
    """
    # Get appointment details
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )

    # Get payment model for barber at this location
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == appointment.barber_id,
            BarberPaymentModel.location_id == appointment.location_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber not set up for payments at this location",
        )

    # Check if barber has connected account
    if (
        not payment_model.stripe_connect_account_id
        and not payment_model.square_merchant_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barber has not connected a payment account for this location",
        )

    # Calculate split
    split_service = PaymentSplitService()
    split = split_service.calculate_split(
        total_amount=Decimal(str(appointment.price)),
        barber_payment_model={
            "payment_type": payment_model.payment_type.value,
            "service_commission_rate": payment_model.service_commission_rate,
        },
    )

    try:
        # Process payment based on barber's connected platform
        if payment_model.stripe_connect_account_id:
            result = split_service.create_stripe_payment_with_split(
                {
                    "amount": appointment.price,
                    "barber_amount": split["barber_amount"],
                    "barber_stripe_account_id": payment_model.stripe_connect_account_id,
                    "barber_id": appointment.barber_id,
                    "appointment_id": appointment.id,
                    "payment_method_id": payment_method_id,
                    "customer_id": appointment.client_id,
                    "description": f"{appointment.service_name} at {appointment.location.name}",
                    "commission_rate": split["commission_rate"],
                }
            )
            platform = "stripe"

        elif payment_model.square_merchant_id:
            result = split_service.create_square_payment_with_split(
                {
                    "amount": appointment.price,
                    "barber_amount": split["barber_amount"],
                    "barber_id": appointment.barber_id,
                    "appointment_id": appointment.id,
                    "source_id": source_id,
                    "customer_id": appointment.client_id,
                    "location_id": payment_model.square_location_id,
                    "description": f"{appointment.service_name} at {appointment.location.name}",
                }
            )
            platform = "square"

        # Record payment
        payment = Payment(
            appointment_id=appointment.id,
            amount=appointment.price,
            status="succeeded",
            payment_method="card",
            stripe_payment_intent_id=result.get("payment_intent_id"),
            metadata={
                "location_id": appointment.location_id,
                "barber_id": appointment.barber_id,
                "platform": platform,
                "split": split,
                "barber_received": split["barber_amount"],
                "shop_commission": split["shop_amount"],
            },
        )
        db.add(payment)
        db.commit()

        return {
            "success": True,
            "payment_id": result.get("payment_intent_id") or result.get("payment_id"),
            "location": appointment.location.name,
            "barber": f"{appointment.barber.user.first_name} {appointment.barber.user.last_name}",
            "total_amount": appointment.price,
            "shop_commission": split["shop_amount"],
            "barber_received": split["barber_amount"],
            "message": f"Payment processed! {appointment.barber.user.first_name} received ${split['barber_amount']:.2f} instantly",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment failed: {str(e)}",
        )


@router.post("/oauth-callback-location")
async def handle_location_oauth_callback(
    code: str, state: str, platform: str, db: Session = Depends(get_db)
):
    """
    Handle OAuth callback for location-specific barber connections
    """
    # Parse state to get barber_id and location_id
    try:
        barber_id, location_id, state_token = state.split(":")
        barber_id = int(barber_id)
        location_id = int(location_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state parameter"
        )

    # Get payment model for this barber-location
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber_id,
            BarberPaymentModel.location_id == location_id,
            BarberPaymentModel.active == True,
        )
        .first()
    )

    if not payment_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment model not found for this barber-location",
        )

    # Complete OAuth
    split_service = PaymentSplitService()

    try:
        if platform == "stripe":
            result = split_service.complete_stripe_oauth(code)
            payment_model.stripe_connect_account_id = result["stripe_account_id"]
            payment_model.stripe_payouts_enabled = True
            payment_model.stripe_onboarding_completed = True

        elif platform == "square":
            result = split_service.complete_square_oauth(code)
            payment_model.square_merchant_id = result["merchant_id"]
            payment_model.square_access_token = result[
                "access_token"
            ]  # Encrypt in production
            payment_model.square_account_verified = True

        db.commit()

        location = payment_model.location
        barber = payment_model.barber

        return {
            "success": True,
            "platform": platform,
            "location": location.name,
            "barber": f"{barber.user.first_name} {barber.user.last_name}",
            "message": f"{platform.title()} account connected successfully for {location.name}!",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect account: {str(e)}",
        )


# Include in main router
def include_router(app):
    app.include_router(
        router, prefix="/api/v1/location-payments", tags=["location-payments"]
    )
