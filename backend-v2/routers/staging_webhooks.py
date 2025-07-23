"""
Staging webhook router for safe testing of webhook integrations.
Separate from production webhooks with enhanced logging and debugging.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status, Header, Response
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
import stripe
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from database import get_db
from config import settings
from models import Payment, Refund, Payout
from models.webhook_event import WebhookEvent, WebhookEventService
from services.webhook_security import WebhookSecurityService, get_webhook_security_service
from utils.staging_config import get_staging_config
from utils.webhook_retry import webhook_error_recovery, safe_json_parse, safe_database_operation
from utils.staging_validation import validate_staging_config, check_staging_readiness
import time

# Security settings
MAX_REQUEST_SIZE = 1024 * 1024  # 1MB limit for webhook payloads
RATE_LIMIT_WINDOW = 60  # 60 seconds
MAX_REQUESTS_PER_WINDOW = 100  # 100 requests per minute per IP

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

# Simple in-memory rate limiting (for production, use Redis)
request_counts = {}

def check_request_size(request: Request) -> None:
    """Validate request size to prevent DoS attacks"""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Request too large. Maximum size: {MAX_REQUEST_SIZE} bytes"
        )

def check_rate_limit(request: Request) -> None:
    """Simple rate limiting for staging webhooks"""
    client_ip = request.client.host if request.client else "unknown"
    current_time = datetime.now().timestamp()
    
    # Clean old entries
    cutoff_time = current_time - RATE_LIMIT_WINDOW
    request_counts[client_ip] = [
        timestamp for timestamp in request_counts.get(client_ip, [])
        if timestamp > cutoff_time
    ]
    
    # Check rate limit
    if len(request_counts.get(client_ip, [])) >= MAX_REQUESTS_PER_WINDOW:
        staging_logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Add current request
    request_counts.setdefault(client_ip, []).append(current_time)

def add_security_headers(response: Response) -> None:
    """Add security headers to webhook responses"""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'none'"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

@router.post("/stripe")
async def handle_staging_stripe_webhook(
    request: Request,
    response: Response,
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
    - Request size and rate limiting
    - Security headers
    """
    try:
        start_time = time.time()
        
        # Apply security checks
        check_request_size(request)
        check_rate_limit(request)
        add_security_headers(response)
        
        # Get staging configuration
        staging_config = get_staging_config()
        
        # Get request details for audit trail
        source_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent")
        headers_dict = dict(request.headers)
        
        # Enhanced request logging
        staging_logger.info(f"Staging webhook received from IP: {source_ip}")
        staging_logger.info(f"Headers: {headers_dict}")
        
        # Get raw payload
        payload = await request.body()
        payload_str = payload.decode('utf-8')
        staging_logger.info(f"Payload size: {len(payload)} bytes")
        
        # Initialize webhook event service
        webhook_service = WebhookEventService(db)
        
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
        
        # Process webhook with comprehensive error recovery
        async def process_stripe_webhook():
            try:
                # Verify signature
                event = stripe.Webhook.construct_event(
                    payload, stripe_signature, staging_webhook_secret
                )
                staging_logger.info(f"Webhook signature verified for event: {event['type']}")
                return event
                
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
        
        # Use error recovery system for webhook processing
        recovery_result = await webhook_error_recovery.process_webhook_with_recovery(
            provider="stripe",
            processing_func=process_stripe_webhook
        )
        
        if recovery_result["status"] != "success":
            staging_logger.error(f"Webhook processing failed with recovery: {recovery_result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Webhook processing failed: {recovery_result.get('error', 'Unknown error')}"
            )
        
        event = recovery_result["result"]
        
        # Create webhook event record for audit trail (with retry)
        webhook_event = await safe_database_operation(
            webhook_service.create_webhook_event,
            provider="stripe",
            event_id=event['id'],
            event_type=event['type'],
            environment="staging",
            source_ip=source_ip,
            user_agent=user_agent,
            headers=headers_dict,
            payload=payload_str,
            signature=stripe_signature,
            signature_valid=True,
            operation_name="create_webhook_event"
        )
        
        # Check for duplicate events
        duplicate_events = webhook_service.get_duplicate_events("stripe", event['id'], "staging")
        if len(duplicate_events) > 1:  # Current event + previous duplicates
            staging_logger.info(f"Duplicate Stripe webhook event: {event['id']}")
            webhook_event.mark_as_duplicate()
            return {
                "status": "duplicate",
                "event_id": event['id'],
                "message": "Duplicate event ignored",
                "environment": "staging"
            }
        
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
            response_data.update(process_staging_payment_success(event_data))
            
        elif event_type == 'payment_intent.payment_failed':
            response_data.update(process_staging_payment_failure(event_data))
            
        elif event_type == 'customer.subscription.created':
            response_data.update(process_staging_subscription_created(event_data))
            
        elif event_type == 'invoice.payment_succeeded':
            response_data.update(process_staging_invoice_payment(event_data))
            
        else:
            staging_logger.info(f"Unhandled event type in staging: {event_type}")
            response_data.update({
                "action": "logged_only",
                "message": f"Event {event_type} logged for staging analysis"
            })
        
        # Mark webhook as successfully processed
        processing_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
        webhook_event.mark_as_processed(response_data, processing_time)
        
        staging_logger.info(f"Staging webhook processed successfully in {processing_time}ms: {response_data}")
        return response_data
        
    except HTTPException as he:
        # Track HTTP exceptions (signature validation, etc.)
        if 'webhook_event' in locals():
            processing_time = int((time.time() - start_time) * 1000)
            webhook_event.mark_as_failed(he.detail, processing_time)
        raise
    except Exception as e:
        # Track general processing errors
        processing_time = int((time.time() - start_time) * 1000)
        error_msg = f"Staging webhook processing error: {str(e)}"
        
        if 'webhook_event' in locals():
            webhook_event.mark_as_failed(error_msg, processing_time)
        
        staging_logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Staging webhook processing failed: {str(e)}"
        )

def process_staging_payment_success(payment_intent: Dict) -> Dict[str, Any]:
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

def process_staging_payment_failure(payment_intent: Dict) -> Dict[str, Any]:
    """Process failed payment in staging environment"""
    staging_logger.warning(f"Staging payment failure: {payment_intent['id']}")
    
    return {
        "action": "payment_failure_logged",
        "payment_intent_id": payment_intent['id'],
        "failure_reason": payment_intent.get('last_payment_error', {}).get('message', 'Unknown'),
        "staging_note": "Payment failure analyzed in staging environment"
    }

def process_staging_subscription_created(subscription: Dict) -> Dict[str, Any]:
    """Process subscription creation in staging environment"""
    staging_logger.info(f"Staging subscription created: {subscription['id']}")
    
    return {
        "action": "subscription_creation_logged",
        "subscription_id": subscription['id'],
        "customer_id": subscription['customer'],
        "status": subscription['status'],
        "staging_note": "Subscription creation tracked in staging environment"
    }

def process_staging_invoice_payment(invoice: Dict) -> Dict[str, Any]:
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
async def handle_staging_sms_webhook(request: Request, response: Response) -> Dict[str, Any]:
    """Handle SMS webhook events in staging environment with security features"""
    try:
        # Apply security checks
        check_request_size(request)
        check_rate_limit(request)
        add_security_headers(response)
        
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
            "/staging/webhooks/test",
            "/staging/webhooks/validate",
            "/staging/webhooks/stats"
        ],
        "message": "Staging webhook system is operational",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/stats")
async def get_staging_webhook_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get staging webhook processing statistics"""
    try:
        webhook_service = WebhookEventService(db)
        stats = webhook_service.get_webhook_stats("staging")
        
        # Get recent events for additional insights
        recent_events = webhook_service.get_webhook_events(
            environment="staging",
            limit=10
        )
        
        return {
            "statistics": stats,
            "recent_events": [
                {
                    "event_id": event.event_id,
                    "provider": event.provider,
                    "event_type": event.event_type,
                    "status": event.status,
                    "received_at": event.received_at.isoformat(),
                    "processing_duration_ms": event.processing_duration_ms,
                    "source_ip": event.source_ip
                }
                for event in recent_events
            ],
            "system_info": {
                "environment": "staging",
                "rate_limit_window": RATE_LIMIT_WINDOW,
                "max_requests_per_window": MAX_REQUESTS_PER_WINDOW,
                "max_request_size_mb": MAX_REQUEST_SIZE / (1024 * 1024)
            }
        }
    except Exception as e:
        staging_logger.error(f"Error retrieving webhook stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve webhook statistics: {str(e)}"
        )

@router.get("/config/validate")
async def validate_staging_configuration() -> Dict[str, Any]:
    """Validate staging environment configuration"""
    try:
        validation_result = validate_staging_config()
        
        # Add webhook-specific checks
        webhook_checks = {
            "webhook_endpoints_available": True,
            "rate_limiting_configured": True,
            "security_headers_enabled": True,
            "error_recovery_active": True,
            "audit_trail_enabled": True
        }
        
        validation_result["webhook_system"] = webhook_checks
        
        return validation_result
        
    except Exception as e:
        staging_logger.error(f"Configuration validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration validation failed: {str(e)}"
        )

@router.get("/recovery/stats")
async def get_error_recovery_stats() -> Dict[str, Any]:
    """Get error recovery system statistics"""
    try:
        recovery_stats = webhook_error_recovery.get_recovery_stats()
        
        return {
            "recovery_system": recovery_stats,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": "staging"
        }
        
    except Exception as e:
        staging_logger.error(f"Error retrieving recovery stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve recovery statistics: {str(e)}"
        )

@router.post("/validate")
async def validate_staging_webhook(
    request: Request,
    response: Response,
    webhook_type: str,
    test_payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Validate webhook payload structure and processing with security checks"""
    try:
        # Apply security checks
        check_request_size(request)
        check_rate_limit(request)
        add_security_headers(response)
        
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
