"""
Test endpoint to verify Stripe connection status
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from config.database import get_db
from models.barber import Barber
from models.barber_payment import BarberPaymentModel
from services.stripe_connect_service import StripeConnectService

router = APIRouter()


@router.get("/test-stripe-status/{barber_name}")
async def test_stripe_status(
    barber_name: str,
    db: Session = Depends(get_db),
):
    """
    Test endpoint to check Stripe connection status for a barber by name
    Example: /api/v1/test-stripe/test-stripe-status/christopher
    """
    # Find barber by first name (case insensitive)
    barber = (
        db.query(Barber).filter(Barber.first_name.ilike(f"%{barber_name}%")).first()
    )

    if not barber:
        return {"error": f"No barber found with name containing '{barber_name}'"}

    # Get payment model
    payment_model = (
        db.query(BarberPaymentModel)
        .filter(
            BarberPaymentModel.barber_id == barber.id, BarberPaymentModel.active == True
        )
        .first()
    )

    result = {
        "barber": {
            "id": barber.id,
            "name": f"{barber.first_name} {barber.last_name}",
            "email": barber.email,
            "location_id": barber.location_id,
        },
        "payment_model": None,
        "stripe_status": None,
    }

    if not payment_model:
        result["payment_model"] = "No active payment model found"
        return result

    result["payment_model"] = {
        "id": payment_model.id,
        "payment_type": (
            payment_model.payment_type.value if payment_model.payment_type else None
        ),
        "service_commission_rate": payment_model.service_commission_rate,
        "product_commission_rate": payment_model.product_commission_rate,
        "stripe_connect_account_id": payment_model.stripe_connect_account_id,
        "stripe_onboarding_completed": payment_model.stripe_onboarding_completed,
        "stripe_payouts_enabled": payment_model.stripe_payouts_enabled,
    }

    # Test Stripe connection if account ID exists
    if payment_model.stripe_connect_account_id:
        try:
            stripe_service = StripeConnectService()
            # Get account details from Stripe
            account_info = stripe_service.get_account_details(
                payment_model.stripe_connect_account_id
            )

            result["stripe_status"] = {
                "connected": True,
                "account_id": payment_model.stripe_connect_account_id,
                "payouts_enabled": account_info.get("payouts_enabled", False),
                "charges_enabled": account_info.get("charges_enabled", False),
                "details_submitted": account_info.get("details_submitted", False),
                "account_type": account_info.get("type", "unknown"),
                "country": account_info.get("country", "unknown"),
                "created": account_info.get("created", None),
            }

            # Get dashboard link
            try:
                dashboard_url = stripe_service.create_login_link(
                    payment_model.stripe_connect_account_id
                )
                result["stripe_status"]["dashboard_url"] = dashboard_url
            except:
                result["stripe_status"]["dashboard_url"] = None

        except Exception as e:
            result["stripe_status"] = {
                "connected": False,
                "error": str(e),
                "account_id": payment_model.stripe_connect_account_id,
            }
    else:
        result["stripe_status"] = {
            "connected": False,
            "reason": "No Stripe account ID in database",
        }

    return result


# Include in API
def include_router(app):
    app.include_router(router, prefix="/api/v1/test-stripe", tags=["test-stripe"])
