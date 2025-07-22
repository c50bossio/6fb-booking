"""
Staging webhook router for safe testing of webhook integrations.
Separate from production webhooks with enhanced logging and debugging.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status, Header
from sqlalchemy.orm import Session
import stripe
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from database import get_db
from config import settings
from models import Payment, Refund, Payout
from services.webhook_security import WebhookSecurityService
from utils.staging_config import get_staging_config

# Staging-specific router
router = APIRouter(
    prefix="/staging/webhooks",
    tags=["staging-webhooks"],
    responses={404: {"description": "Not found"}}
)

logger = logging.getLogger(__name__)

# Enhanced logging for staging
staging_logger = logging.getLogger("staging.webhooks")
staging_logger.setLevel(logging.DEBUG)

@router.post("/stripe")
async def handle_staging_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
) -> Dict[str, Any]:
    """
    Handle Stripe webhook events in staging environment.
    
    Features:
    - Enhanced logging for debugging
    - Separate webhook secrets from production
    - Safe processing without affecting live data
    - Detailed response validation
    """
    try:
        # Get staging configuration
        staging_config = get_staging_config()
        
        # Enhanced request logging
        staging_logger.info(f"Staging webhook received from IP: {request.client.host if request.client else 'unknown'}")
        staging_logger.info(f"Headers: {dict(request.headers)}")
        
        # Get raw payload
        payload = await request.body()
        staging_logger.info(f"Payload size: {len(payload)} bytes")
        
        if not stripe_signature:
            staging_logger.error("Missing Stripe signature header")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing stripe-signature header"
            )
        
        # Verify webhook signature with staging secret
        staging_webhook_secret = staging_config.get("stripe_webhook_secret")
        
        if not staging_webhook_secret:
            staging_logger.error("Staging webhook secret not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Staging webhook secret not configured"
            )
        
        try:
            # Verify signature
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, staging_webhook_secret
            )
            staging_logger.info(f"Webhook signature verified for event: {event['type']}")
            
        except ValueError as e:
            staging_logger.error(f"Invalid payload: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        except stripe.error.SignatureVerificationError as e:
            staging_logger.error(f"Invalid signature: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        
        # Log event details for debugging
        staging_logger.info(f"Processing event: {event['type']} - {event['id']}")
        staging_logger.debug(f"Event data: {json.dumps(event['data'], indent=2)}")
        
        # Process event based on type
        event_type = event['type']
        event_data = event['data']['object']
        
        response_data = {
            "status": "success",
            "event_id": event['id'],
            "event_type": event_type,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "environment": "staging"
        }
        
        if event_type == 'payment_intent.succeeded':
            response_data.update(await process_staging_payment_success(db, event_data))
            
        elif event_type == 'payment_intent.payment_failed':
            response_data.update(await process_staging_payment_failure(db, event_data))
            
        elif event_type == 'customer.subscription.created':
            response_data.update(await process_staging_subscription_created(db, event_data))
            
        elif event_type == 'invoice.payment_succeeded':
            response_data.update(await process_staging_invoice_payment(db, event_data))
            
        else:
            staging_logger.info(f"Unhandled event type in staging: {event_type}")
            response_data.update({
                "action": "logged_only",
                "message": f"Event {event_type} logged for staging analysis"
            })
        
        staging_logger.info(f"Staging webhook processed successfully: {response_data}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        staging_logger.error(f"Staging webhook processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Staging webhook processing failed: {str(e)}"
        )

async def process_staging_payment_success(db: Session, payment_intent: Dict) -> Dict[str, Any]:
    """Process successful payment in staging environment"""
    staging_logger.info(f"Staging payment success: {payment_intent['id']}")
    
    # In staging, we log but don't modify production data
    return {
        "action": "payment_success_logged",
        "payment_intent_id": payment_intent['id'],
        "amount": payment_intent['amount'],
        "currency": payment_intent['currency'],
        "staging_note": "Payment processed in staging environment"
    }

async def process_staging_payment_failure(db: Session, payment_intent: Dict) -> Dict[str, Any]:
    """Process failed payment in staging environment"""
    staging_logger.warning(f"Staging payment failure: {payment_intent['id']}")
    
    return {
        "action": "payment_failure_logged",
        "payment_intent_id": payment_intent['id'],
        "failure_reason": payment_intent.get('last_payment_error', {}).get('message', 'Unknown'),
        "staging_note": "Payment failure analyzed in staging environment"
    }

async def process_staging_subscription_created(db: Session, subscription: Dict) -> Dict[str, Any]:
    """Process subscription creation in staging environment"""
    staging_logger.info(f"Staging subscription created: {subscription['id']}")
    
    return {
        "action": "subscription_creation_logged",
        "subscription_id": subscription['id'],
        "customer_id": subscription['customer'],
        "status": subscription['status'],
        "staging_note": "Subscription creation tracked in staging environment"
    }

async def process_staging_invoice_payment(db: Session, invoice: Dict) -> Dict[str, Any]:
    """Process invoice payment in staging environment"""
    staging_logger.info(f"Staging invoice payment: {invoice['id']}")
    
    return {
        "action": "invoice_payment_logged",
        "invoice_id": invoice['id'],
        "amount_paid": invoice['amount_paid'],
        "subscription_id": invoice.get('subscription'),
        "staging_note": "Invoice payment recorded in staging environment"
    }

@router.post("/sms")
async def handle_staging_sms_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Handle SMS webhook events in staging environment"""
    try:
        staging_logger.info("Staging SMS webhook received")
        
        # Get form data (Twilio sends form-encoded data)
        form_data = await request.form()
        sms_data = dict(form_data)
        
        staging_logger.info(f"SMS webhook data: {sms_data}")
        
        # Process SMS event for staging
        return {
            "status": "success",
            "environment": "staging",
            "sms_data": sms_data,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "staging_note": "SMS webhook processed in staging environment"
        }
        
    except Exception as e:
        staging_logger.error(f"Staging SMS webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Staging SMS webhook failed: {str(e)}"
        )

@router.get("/test")
async def test_staging_webhook_endpoint():
    """Test endpoint to verify staging webhook system is working"""
    return {
        "status": "staging_webhooks_active",
        "environment": "staging",
        "endpoints": [
            "/staging/webhooks/stripe",
            "/staging/webhooks/sms",
            "/staging/webhooks/test"
        ],
        "message": "Staging webhook system is operational",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.post("/validate")
async def validate_staging_webhook(
    request: Request,
    webhook_type: str,
    test_payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Validate webhook payload structure and processing"""
    try:
        staging_logger.info(f"Validating {webhook_type} webhook with test payload")
        
        validation_results = {
            "webhook_type": webhook_type,
            "payload_valid": True,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "environment": "staging"
        }
        
        # Validate payload structure
        if webhook_type == "stripe":
            required_fields = ["id", "type", "data"]
            for field in required_fields:
                if field not in test_payload:
                    validation_results["payload_valid"] = False
                    validation_results["missing_field"] = field
                    break
        
        elif webhook_type == "sms":
            required_fields = ["From", "Body"]
            for field in required_fields:
                if field not in test_payload:
                    validation_results["payload_valid"] = False
                    validation_results["missing_field"] = field
                    break
        
        validation_results["test_payload"] = test_payload
        staging_logger.info(f"Validation results: {validation_results}")
        
        return validation_results
        
    except Exception as e:
        staging_logger.error(f"Webhook validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook validation failed: {str(e)}"
        )
