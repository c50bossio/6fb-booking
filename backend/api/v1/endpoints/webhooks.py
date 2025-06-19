"""Webhook endpoints for handling external service events."""
import stripe
import logging
import json
import hmac
import hashlib
import os
from typing import Optional
from datetime import datetime
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

# Trafft webhook secret (your client secret)
TRAFFT_WEBHOOK_SECRET = os.environ.get("TRAFFT_WEBHOOK_SECRET", "")


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


def verify_trafft_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify the webhook signature from Trafft"""
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


@router.post("/trafft")
async def handle_trafft_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: Optional[str] = Header(None),
    x_trafft_signature: Optional[str] = Header(None),
    x_verification_token: Optional[str] = Header(None)
):
    """Handle incoming Trafft webhook events."""
    # Check for verification token in headers or query params
    verification_token = x_verification_token or request.query_params.get("verification_token")
    
    # Trafft verification token
    TRAFFT_VERIFICATION_TOKEN = "$1$ecfe1c41$.krVxYWuJm8I1mTRcT00j0"
    
    # If this is a verification request, just return the token
    if verification_token == TRAFFT_VERIFICATION_TOKEN:
        logger.info("Trafft webhook verification successful")
        return {"status": "verified", "token": verification_token}
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Log request details for debugging
    content_type = request.headers.get("content-type", "")
    logger.info(f"Received Trafft webhook - Content-Type: {content_type}")
    logger.info(f"Body length: {len(body)}, preview: {body[:200]}")
    
    # Handle empty body (might be verification ping)
    if not body:
        logger.warning("Trafft webhook received with empty body")
        # Return verification token if this is a verification request
        return {"status": "received", "verification_token": TRAFFT_VERIFICATION_TOKEN}
    
    # Try different signature header names
    signature = x_webhook_signature or x_trafft_signature
    
    # Verify signature if provided
    if signature and TRAFFT_WEBHOOK_SECRET:
        if not verify_trafft_signature(body, signature, TRAFFT_WEBHOOK_SECRET):
            logger.warning("Invalid Trafft webhook signature")
            # Log but don't reject - Trafft might not send signatures
    
    # Parse the payload based on content type
    try:
        if "application/json" in content_type:
            data = json.loads(body)
        elif "application/x-www-form-urlencoded" in content_type:
            # Parse form data
            from urllib.parse import parse_qs
            form_data = parse_qs(body.decode('utf-8'))
            # Convert form data to dict (taking first value of each key)
            data = {k: v[0] if len(v) == 1 else v for k, v in form_data.items()}
            logger.info(f"Parsed form data: {data}")
        else:
            # Try JSON anyway
            data = json.loads(body)
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {str(e)}")
        # Return 200 to prevent Trafft from retrying
        return {"status": "error", "message": "Invalid payload format"}
    
    # Log the event type and data
    event_type = data.get("event") or data.get("type") or "unknown"
    logger.info(f"Trafft webhook event: {event_type}")
    logger.info(f"Payload: {json.dumps(data, indent=2)}")
    
    # Store webhook data for analysis (temporary)
    try:
        import sqlite3
        conn = sqlite3.connect("/tmp/trafft_webhooks.db")
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS webhook_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT,
                content_type TEXT,
                body_raw TEXT,
                body_parsed TEXT
            )
        """)
        cursor.execute("""
            INSERT INTO webhook_logs (event_type, content_type, body_raw, body_parsed)
            VALUES (?, ?, ?, ?)
        """, (event_type, content_type, body.decode('utf-8', errors='ignore'), json.dumps(data)))
        conn.commit()
        conn.close()
        logger.info("Webhook data stored for analysis")
    except Exception as e:
        logger.error(f"Failed to store webhook data: {str(e)}")
    
    # Process based on event type
    try:
        if "appointment" in event_type.lower():
            await process_trafft_appointment(event_type, data, db)
        elif "customer" in event_type.lower():
            await process_trafft_customer(event_type, data, db)
        elif "payment" in event_type.lower():
            await process_trafft_payment(event_type, data, db)
        else:
            logger.info(f"Unhandled Trafft event type: {event_type}")
    except Exception as e:
        logger.error(f"Error processing Trafft webhook: {str(e)}")
        # Still return success to prevent retries
    
    return {"status": "received", "event": event_type}


async def process_trafft_appointment(event_type: str, data: dict, db: Session):
    """Process Trafft appointment events"""
    appointment = data.get("appointment") or data.get("data") or data
    
    logger.info(f"Processing Trafft appointment: {event_type}")
    
    # TODO: Map Trafft data to your models and save
    # Example structure (adjust based on actual Trafft payload):
    # - appointment.id
    # - appointment.customerId
    # - appointment.employeeId
    # - appointment.serviceId
    # - appointment.startTime
    # - appointment.status
    # - appointment.price
    
    # For now, just log
    logger.info(f"Appointment data: {appointment}")


async def process_trafft_customer(event_type: str, data: dict, db: Session):
    """Process Trafft customer events"""
    customer = data.get("customer") or data.get("data") or data
    
    logger.info(f"Processing Trafft customer: {event_type}")
    logger.info(f"Customer data: {customer}")
    
    # TODO: Create or update client in your database


async def process_trafft_payment(event_type: str, data: dict, db: Session):
    """Process Trafft payment events"""
    payment = data.get("payment") or data.get("data") or data
    
    logger.info(f"Processing Trafft payment: {event_type}")
    logger.info(f"Payment data: {payment}")
    
    # TODO: Record payment in your database


@router.get("/trafft")
async def verify_trafft_webhook(
    verification_token: Optional[str] = None,
    token: Optional[str] = None,
    challenge: Optional[str] = None
):
    """Handle Trafft webhook verification (GET request)"""
    TRAFFT_VERIFICATION_TOKEN = "$1$ecfe1c41$.krVxYWuJm8I1mTRcT00j0"
    
    logger.info(f"Trafft GET verification - token: {verification_token or token}, challenge: {challenge}")
    
    # Return the verification token or challenge
    if challenge:
        return {"challenge": challenge}
    elif verification_token == TRAFFT_VERIFICATION_TOKEN or token == TRAFFT_VERIFICATION_TOKEN:
        return {"status": "verified", "token": TRAFFT_VERIFICATION_TOKEN}
    else:
        # Return the token for verification
        return {"verification_token": TRAFFT_VERIFICATION_TOKEN}


@router.get("/trafft/setup")
async def trafft_webhook_setup():
    """Return Trafft webhook setup instructions"""
    return {
        "webhook_url": "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft",
        "instructions": [
            "1. Log into Trafft dashboard",
            "2. Go to Settings > Integrations > Webhooks",
            "3. Add the webhook URL above",
            "4. Select events to receive:",
            "   - Appointment Created/Updated/Cancelled",
            "   - Customer Created/Updated",
            "   - Payment Completed",
            "5. Save and test the webhook"
        ],
        "test_endpoint": "https://sixfb-backend.onrender.com/api/v1/webhooks/trafft/test"
    }


@router.get("/trafft/logs")
async def view_trafft_webhook_logs(limit: int = 10):
    """View recent Trafft webhook logs for debugging"""
    try:
        import sqlite3
        conn = sqlite3.connect("/tmp/trafft_webhooks.db")
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, event_type, content_type, body_raw, body_parsed 
            FROM webhook_logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
        
        logs = cursor.fetchall()
        conn.close()
        
        webhook_logs = []
        for log in logs:
            webhook_logs.append({
                "timestamp": log[0],
                "event_type": log[1],
                "content_type": log[2],
                "body_raw": log[3][:200] + "..." if len(log[3]) > 200 else log[3],
                "body_parsed": json.loads(log[4]) if log[4] else None
            })
        
        return {
            "count": len(webhook_logs),
            "logs": webhook_logs
        }
    except Exception as e:
        return {"error": str(e), "message": "No webhook logs found yet"}


@router.post("/trafft/debug")
async def debug_trafft_webhook(request: Request):
    """Debug endpoint to see exactly what Trafft sends"""
    body = await request.body()
    
    # Get all headers
    headers = dict(request.headers)
    
    # Log everything
    logger.info("=== TRAFFT WEBHOOK DEBUG ===")
    logger.info(f"Method: {request.method}")
    logger.info(f"URL: {request.url}")
    logger.info(f"Headers: {json.dumps(headers, indent=2)}")
    logger.info(f"Body length: {len(body)}")
    logger.info(f"Body (raw): {body}")
    
    try:
        # Try to decode as text
        body_text = body.decode('utf-8')
        logger.info(f"Body (text): {body_text}")
    except:
        logger.info("Body could not be decoded as UTF-8")
    
    return {
        "status": "debug_received",
        "body_length": len(body),
        "content_type": headers.get("content-type", "none"),
        "headers_count": len(headers)
    }