"""Webhook endpoints for handling Stripe events."""
import stripe
import logging
from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
from sqlalchemy.orm import Session

from config.settings import get_settings
from config.database import get_db
from services.stripe_service import StripeService

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db)
):
    """Handle incoming Stripe webhook events."""
    # Get the webhook endpoint secret
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    if not endpoint_secret:
        logger.error("Stripe webhook secret not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook endpoint not properly configured"
        )
    
    # Get the raw body
    try:
        payload = await request.body()
    except Exception as e:
        logger.error(f"Error reading request body: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request body"
        )
    
    # Verify webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, endpoint_secret
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    # Log the event
    logger.info(f"Received Stripe webhook event: {event.type} (ID: {event.id})")
    
    # Handle the event
    try:
        stripe_service = StripeService(db)
        await stripe_service.handle_webhook_event(event)
        
        return {"status": "success", "event_id": event.id}
    except Exception as e:
        logger.error(f"Error handling webhook event {event.id}: {str(e)}")
        # Return success to prevent Stripe from retrying
        # but log the error for investigation
        return {"status": "error_logged", "event_id": event.id}