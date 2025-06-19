#!/usr/bin/env python3
"""
Trafft Webhook Receiver
Receives real-time updates from Trafft when events occur
"""
from fastapi import FastAPI, Request, HTTPException, Header
from typing import Optional
import json
import hmac
import hashlib
from datetime import datetime
import logging

# Your webhook credentials from earlier
WEBHOOK_SECRET = "bdc3e1eb65cc5638fb89f0997e1e3858f0e021440e42c16a0e66f5984732599e"  # Your client secret

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify the webhook signature to ensure it's from Trafft"""
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)

@app.post("/webhooks/trafft")
async def handle_trafft_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None),
    x_trafft_signature: Optional[str] = Header(None)
):
    """
    Receive and process Trafft webhooks
    
    Expected events:
    - appointment.created
    - appointment.updated
    - appointment.cancelled
    - customer.created
    - customer.updated
    - payment.completed
    """
    
    # Get raw body for signature verification
    body = await request.body()
    
    # Try different signature header names
    signature = x_webhook_signature or x_trafft_signature
    
    # Log the webhook receipt
    logger.info(f"Received webhook - Signature present: {bool(signature)}")
    
    # Verify signature if provided
    if signature and WEBHOOK_SECRET:
        if not verify_webhook_signature(body, signature, WEBHOOK_SECRET):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse the JSON payload
    try:
        data = await request.json()
    except:
        logger.error("Invalid JSON in webhook payload")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Log the event type and data
    event_type = data.get("event") or data.get("type") or "unknown"
    logger.info(f"Webhook event: {event_type}")
    logger.info(f"Payload: {json.dumps(data, indent=2)}")
    
    # Process based on event type
    if "appointment" in event_type.lower():
        await process_appointment_event(event_type, data)
    elif "customer" in event_type.lower():
        await process_customer_event(event_type, data)
    elif "payment" in event_type.lower():
        await process_payment_event(event_type, data)
    else:
        logger.info(f"Unhandled event type: {event_type}")
    
    # Return success
    return {"status": "received", "event": event_type}

async def process_appointment_event(event_type: str, data: dict):
    """Process appointment-related events"""
    appointment = data.get("appointment") or data.get("data") or data
    
    logger.info(f"Processing appointment event: {event_type}")
    
    # Extract appointment details
    appointment_info = {
        "id": appointment.get("id"),
        "customer_id": appointment.get("customerId") or appointment.get("customer_id"),
        "employee_id": appointment.get("employeeId") or appointment.get("employee_id"),
        "service_id": appointment.get("serviceId") or appointment.get("service_id"),
        "start_time": appointment.get("startTime") or appointment.get("start_time"),
        "end_time": appointment.get("endTime") or appointment.get("end_time"),
        "status": appointment.get("status"),
        "price": appointment.get("price"),
        "notes": appointment.get("notes"),
        "created_at": appointment.get("createdAt") or appointment.get("created_at"),
    }
    
    # TODO: Save to database
    logger.info(f"Appointment info: {appointment_info}")
    
    # Send email notification if needed
    if event_type == "appointment.created":
        # TODO: Send confirmation email via SendGrid
        pass
    elif event_type == "appointment.cancelled":
        # TODO: Send cancellation email
        pass

async def process_customer_event(event_type: str, data: dict):
    """Process customer-related events"""
    customer = data.get("customer") or data.get("data") or data
    
    logger.info(f"Processing customer event: {event_type}")
    
    # Extract customer details
    customer_info = {
        "id": customer.get("id"),
        "first_name": customer.get("firstName") or customer.get("first_name"),
        "last_name": customer.get("lastName") or customer.get("last_name"),
        "email": customer.get("email"),
        "phone": customer.get("phone"),
        "created_at": customer.get("createdAt") or customer.get("created_at"),
    }
    
    # TODO: Save to database
    logger.info(f"Customer info: {customer_info}")
    
    # Send welcome email for new customers
    if event_type == "customer.created":
        # TODO: Send welcome email via SendGrid
        pass

async def process_payment_event(event_type: str, data: dict):
    """Process payment-related events"""
    payment = data.get("payment") or data.get("data") or data
    
    logger.info(f"Processing payment event: {event_type}")
    
    # Extract payment details
    payment_info = {
        "id": payment.get("id"),
        "appointment_id": payment.get("appointmentId") or payment.get("appointment_id"),
        "amount": payment.get("amount"),
        "method": payment.get("method"),
        "status": payment.get("status"),
        "created_at": payment.get("createdAt") or payment.get("created_at"),
    }
    
    # TODO: Save to database
    logger.info(f"Payment info: {payment_info}")

@app.get("/webhooks/test")
async def test_webhook_endpoint():
    """Test endpoint to verify webhook receiver is running"""
    return {
        "status": "active",
        "message": "Trafft webhook receiver is running",
        "timestamp": datetime.now().isoformat()
    }

# Webhook setup instructions endpoint
@app.get("/webhooks/setup")
async def webhook_setup_instructions():
    """Return instructions for setting up Trafft webhooks"""
    return {
        "instructions": "Setup Trafft Webhooks",
        "steps": [
            "1. Log into Trafft dashboard",
            "2. Go to Settings > Integrations > Webhooks",
            "3. Add new webhook with URL: https://your-domain.com/webhooks/trafft",
            "4. Select events to subscribe to:",
            "   - Appointment Created",
            "   - Appointment Updated", 
            "   - Appointment Cancelled",
            "   - Customer Created",
            "   - Payment Completed",
            "5. Copy the webhook secret if provided",
            "6. Test the webhook"
        ],
        "webhook_url": "https://sixfb-backend.onrender.com/webhooks/trafft",
        "supported_events": [
            "appointment.created",
            "appointment.updated",
            "appointment.cancelled",
            "customer.created",
            "customer.updated",
            "payment.completed"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)