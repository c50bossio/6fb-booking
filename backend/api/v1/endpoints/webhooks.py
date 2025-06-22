"""Webhook endpoints for handling external service events."""

import stripe
import logging
import json
import hmac
import hashlib
import os
import time
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
from sqlalchemy.orm import Session

from config.settings import get_settings
from config.database import get_db
from services.stripe_service import StripeService


def sanitize_webhook_data(data):
    """Remove sensitive payment data from webhook payload for safe logging"""
    if not isinstance(data, dict):
        return data

    # Sensitive fields to redact
    sensitive_fields = [
        "card_number",
        "card",
        "payment_method",
        "token",
        "secret",
        "private_key",
        "api_key",
        "password",
        "ssn",
        "account_number",
        "routing_number",
        "bank_account",
        "credit_card",
    ]

    sanitized = data.copy()

    for field in sensitive_fields:
        if field in sanitized:
            sanitized[field] = "[REDACTED]"

    # Also sanitize nested objects
    for key, value in sanitized.items():
        if isinstance(value, dict):
            sanitized[key] = sanitize_webhook_data(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_webhook_data(item) if isinstance(item, dict) else item
                for item in value
            ]

    return sanitized


router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    """Handle incoming Stripe webhook events with monitoring."""
    start_time = time.time()
    webhook_success = False
    error_message = None

    # Get the webhook endpoint secret
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    if not endpoint_secret:
        error_message = "Stripe webhook secret not configured"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook endpoint not properly configured",
        )

    # Get the raw body
    try:
        payload = await request.body()
    except Exception as e:
        error_message = f"Error reading request body: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request body"
        )

    # Verify webhook signature
    event = None
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, endpoint_secret
        )
    except ValueError as e:
        error_message = f"Invalid payload: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError as e:
        error_message = f"Invalid signature: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature"
        )

    # Log the event (sanitized)
    sanitized_data = sanitize_webhook_data(
        event.data.object if hasattr(event, "data") else {}
    )
    logger.info(f"Received Stripe webhook event: {event.type} (ID: {event.id})")
    logger.debug(
        f"Webhook event data (sanitized): {json.dumps(sanitized_data, default=str)}"
    )

    # Handle the event
    try:
        from services.payment_monitoring_service import get_payment_monitor

        payment_monitor = get_payment_monitor(db)

        stripe_service = StripeService(db)
        await stripe_service.handle_webhook_event(event)

        webhook_success = True
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        # Track webhook processing
        payment_monitor.track_webhook_event(
            event_type=event.type,
            event_id=event.id,
            processing_time=processing_time,
            success=True,
        )

        return {
            "status": "success",
            "event_id": event.id,
            "processing_time_ms": round(processing_time, 2),
        }

    except Exception as e:
        error_message = f"Error handling webhook event {event.id}: {str(e)}"
        logger.error(error_message)
        processing_time = (time.time() - start_time) * 1000

        # Track failed webhook processing
        try:
            from services.payment_monitoring_service import get_payment_monitor

            payment_monitor = get_payment_monitor(db)
            payment_monitor.track_webhook_event(
                event_type=event.type if event else "unknown",
                event_id=event.id if event else "unknown",
                processing_time=processing_time,
                success=False,
                error_message=str(e),
            )
        except Exception as monitor_error:
            logger.error(f"Failed to track webhook error: {monitor_error}")

        # Return success to prevent Stripe from retrying
        # but log the error for investigation
        return {
            "status": "error_logged",
            "event_id": event.id if event else "unknown",
            "error": "Logged for investigation",
        }
