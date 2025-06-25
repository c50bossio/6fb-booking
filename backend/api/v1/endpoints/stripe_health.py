"""
Stripe Health Check Endpoint
Provides a way to verify Stripe configuration via HTTP
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import stripe
import os
from datetime import datetime

from config.settings import get_settings

router = APIRouter()
settings = get_settings()


def mask_sensitive(value: str) -> str:
    """Mask sensitive values"""
    if not value:
        return "NOT_SET"
    if len(value) > 11:
        return f"{value[:7]}...{value[-4:]}"
    return "***"


@router.get("/stripe/health")
async def stripe_health_check() -> Dict[str, Any]:
    """
    Check Stripe configuration health
    This endpoint can be used to verify Stripe is properly configured
    """
    health_status = {
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT,
        "checks": {
            "api_key": False,
            "webhook_secret": False,
            "connect_client_id": False,
            "api_connection": False,
        },
        "details": {},
    }

    # Check API Key
    if settings.STRIPE_SECRET_KEY:
        health_status["checks"]["api_key"] = True
        health_status["details"]["api_key"] = {
            "present": True,
            "type": (
                "test" if settings.STRIPE_SECRET_KEY.startswith("sk_test_") else "live"
            ),
            "masked": mask_sensitive(settings.STRIPE_SECRET_KEY),
        }
    else:
        health_status["details"]["api_key"] = {
            "present": False,
            "error": "STRIPE_SECRET_KEY not configured",
        }

    # Check Webhook Secret
    if settings.STRIPE_WEBHOOK_SECRET:
        health_status["checks"]["webhook_secret"] = True
        health_status["details"]["webhook_secret"] = {
            "present": True,
            "masked": mask_sensitive(settings.STRIPE_WEBHOOK_SECRET),
        }
    else:
        health_status["details"]["webhook_secret"] = {
            "present": False,
            "error": "STRIPE_WEBHOOK_SECRET not configured",
        }

    # Check Connect Client ID
    if settings.STRIPE_CONNECT_CLIENT_ID:
        health_status["checks"]["connect_client_id"] = True
        health_status["details"]["connect_client_id"] = {
            "present": True,
            "value": settings.STRIPE_CONNECT_CLIENT_ID,
        }
    else:
        health_status["details"]["connect_client_id"] = {
            "present": False,
            "error": "STRIPE_CONNECT_CLIENT_ID not configured",
        }

    # Test API Connection
    if settings.STRIPE_SECRET_KEY:
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            account = stripe.Account.retrieve()
            health_status["checks"]["api_connection"] = True
            health_status["details"]["api_connection"] = {
                "success": True,
                "account_id": account.id,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
            }
        except stripe.error.AuthenticationError as e:
            health_status["details"]["api_connection"] = {
                "success": False,
                "error": "Invalid API key",
                "message": str(e),
            }
        except Exception as e:
            health_status["details"]["api_connection"] = {
                "success": False,
                "error": type(e).__name__,
                "message": str(e),
            }
    else:
        health_status["details"]["api_connection"] = {
            "success": False,
            "error": "No API key configured",
        }

    # Overall health
    health_status["healthy"] = all(health_status["checks"].values())

    if not health_status["healthy"]:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Stripe configuration is incomplete",
                "health_status": health_status,
            },
        )

    return health_status


@router.get("/stripe/test-intent")
async def test_payment_intent() -> Dict[str, Any]:
    """
    Create a test payment intent to verify Stripe is working
    This will create and immediately cancel a payment intent
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY

        # Create test intent
        intent = stripe.PaymentIntent.create(
            amount=1000,  # $10.00
            currency="usd",
            description="Test payment intent - will be cancelled",
            metadata={
                "test": "true",
                "source": "health_check_endpoint",
                "timestamp": datetime.now().isoformat(),
            },
        )

        # Immediately cancel it
        cancelled = stripe.PaymentIntent.cancel(intent.id)

        return {
            "success": True,
            "test_intent": {
                "id": intent.id,
                "amount": intent.amount,
                "currency": intent.currency,
                "status": cancelled.status,
                "created": datetime.fromtimestamp(intent.created).isoformat(),
                "cancelled": cancelled.status == "canceled",
            },
            "stripe_config": {
                "api_version": stripe.api_version,
                "library_version": stripe.VERSION,
            },
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=400, detail={"error": type(e).__name__, "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail={"error": type(e).__name__, "message": str(e)}
        )
