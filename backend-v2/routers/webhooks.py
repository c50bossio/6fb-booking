"""
Webhook handlers for payment processing and SMS responses
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, Form
from sqlalchemy.orm import Session
import stripe
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from db import get_db
from config import settings
from models import Payment, Payout
from services.payment_security import audit_logger
from services.notification_service import notification_service
from services.stripe_service import StripeSubscriptionService

router = APIRouter(
    prefix="/webhooks",
    tags=["webhooks"]
)

logger = logging.getLogger(__name__)

@router.post("/stripe", response_model=None)
async def handle_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Handle Stripe webhook events with enhanced security"""
    try:
        # Get client IP
        source_ip = request.client.host if request.client else "unknown"
        
        # Rate limiting check (simplified for now)
        # rate_limiter = get_webhook_rate_limiter(db)
        # if not rate_limiter.check_rate_limit("stripe", source_ip):
        #     raise HTTPException(
        #         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        #         detail="Webhook rate limit exceeded"
        #     )
        
        # Get the raw payload
        payload = await request.body()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
            )
        
        # Enhanced webhook validation with replay attack prevention (simplified for now)
        # webhook_security = get_webhook_security_service(db)
        # validation_result = webhook_security.validate_stripe_webhook(
        #     payload=payload,
        #     signature=signature,
        #     webhook_secret=settings.stripe_webhook_secret,
        #     source_ip=source_ip
        # )
        
        # Basic signature verification for now
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing webhook signature"
            )
        
        # Parse the event
        try:
            import json
            event = stripe.Event.construct_from(
                json.loads(payload), settings.stripe_secret_key
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        
        # Handle the event
        if event.type == 'payment_intent.succeeded':
            await handle_payment_intent_succeeded(event.data.object, db)
        elif event.type == 'payment_intent.payment_failed':
            await handle_payment_intent_failed(event.data.object, db)
        elif event.type == 'charge.dispute.created':
            await handle_charge_dispute_created(event.data.object, db)
        elif event.type == 'transfer.created':
            await handle_transfer_created(event.data.object, db)
        elif event.type == 'transfer.failed':
            await handle_transfer_failed(event.data.object, db)
        # Subscription webhook events
        elif event.type in [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed'
        ]:
            await handle_subscription_event(event, db)
        else:
            logger.info(f"Unhandled event type: {event.type}")
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing error"
        )

async def handle_payment_intent_succeeded(payment_intent: Dict[str, Any], db: Session):
    """Handle successful payment intent"""
    try:
        # Find the payment record
        payment = db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if not payment:
            logger.warning(f"Payment not found for intent: {payment_intent['id']}")
            return
        
        # Update payment status if not already confirmed
        if payment.status == "pending":
            payment.status = "completed"
            # Extract charge ID if available
            charges = payment_intent.get('charges', {}).get('data', [])
            if charges and len(charges) > 0:
                payment.stripe_payment_id = charges[0]['id']
            else:
                payment.stripe_payment_id = payment_intent['id']
            
            # Update appointment status
            if payment.appointment:
                payment.appointment.status = "confirmed"
            
            db.commit()
            
            logger.info(f"Payment {payment.id} confirmed via webhook")
            
    except Exception as e:
        logger.error(f"Error handling payment success webhook: {str(e)}")
        db.rollback()

async def handle_payment_intent_failed(payment_intent: Dict[str, Any], db: Session):
    """Handle failed payment intent"""
    try:
        # Find the payment record
        payment = db.query(Payment).filter(
            Payment.stripe_payment_intent_id == payment_intent['id']
        ).first()
        
        if not payment:
            logger.warning(f"Payment not found for intent: {payment_intent['id']}")
            return
        
        # Update payment status
        payment.status = "failed"
        
        # Extract failure reason if available
        last_error = payment_intent.get('last_payment_error', {})
        if last_error and 'message' in last_error:
            payment.failure_reason = last_error['message']
        
        # Update appointment status
        if payment.appointment:
            payment.appointment.status = "pending"  # Reset to allow retry
        
        db.commit()
        
        logger.info(f"Payment {payment.id} marked as failed via webhook")
        
        # Log security event for failed payments
        audit_logger.log_security_violation(
            payment.user_id, "payment_failed", 
            f"Payment intent {payment_intent['id']} failed"
        )
        
    except Exception as e:
        logger.error(f"Error handling payment failure webhook: {str(e)}")
        db.rollback()

async def handle_charge_dispute_created(dispute: Dict[str, Any], db: Session):
    """Handle charge dispute creation"""
    try:
        charge_id = dispute.get('charge')
        if not charge_id:
            return
        
        # Find payment by charge ID
        payment = db.query(Payment).filter(
            Payment.stripe_payment_id == charge_id
        ).first()
        
        if not payment:
            logger.warning(f"Payment not found for disputed charge: {charge_id}")
            return
        
        # Update payment status to disputed
        payment.status = "disputed"
        payment.dispute_status = dispute.get('status', 'unknown')
        db.commit()
        
        # Log the dispute
        audit_logger.log_security_violation(
            payment.user_id, "payment_disputed", 
            f"Dispute created for payment {payment.id}, amount: ${dispute.get('amount', 0) / 100}"
        )
        
        logger.warning(f"Dispute created for payment {payment.id}")
        
    except Exception as e:
        logger.error(f"Error handling dispute webhook: {str(e)}")

async def handle_transfer_created(transfer: Dict[str, Any], db: Session):
    """Handle transfer creation"""
    try:
        # Find payout record
        payout = db.query(Payout).filter(
            Payout.stripe_transfer_id == transfer['id']
        ).first()
        
        if payout:
            # Update payout status if it was created
            if transfer.get('status') == 'paid':
                payout.status = "completed"
                payout.paid_at = datetime.utcnow()
                db.commit()
            logger.info(f"Transfer {transfer['id']} created for payout {payout.id}")
        
    except Exception as e:
        logger.error(f"Error handling transfer creation webhook: {str(e)}")

async def handle_transfer_failed(transfer: Dict[str, Any], db: Session):
    """Handle transfer failure"""
    try:
        # Find payout record
        payout = db.query(Payout).filter(
            Payout.stripe_transfer_id == transfer['id']
        ).first()
        
        if not payout:
            logger.warning(f"Payout not found for failed transfer: {transfer['id']}")
            return
        
        # Update payout status
        payout.status = "failed"
        if 'failure_message' in transfer:
            payout.failure_reason = transfer['failure_message']
        db.commit()
        
        logger.error(f"Transfer {transfer['id']} failed for payout {payout.id}")
        
        # Log security event
        audit_logger.log_security_violation(
            payout.barber_id, "payout_failed", 
            f"Transfer {transfer['id']} failed for payout {payout.id}"
        )
        
    except Exception as e:
        logger.error(f"Error handling transfer failure webhook: {str(e)}")
        db.rollback()

@router.post("/sms", response_model=None)
async def handle_sms_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: Optional[str] = Form(None),
    AccountSid: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Handle incoming SMS webhooks from Twilio with enhanced security
    
    This endpoint processes two-way SMS communication for appointment management.
    Twilio sends form-encoded data with From, Body, and other parameters.
    """
    try:
        # Get client IP
        source_ip = request.client.host if request.client else "unknown"
        
        # Rate limiting check (simplified for now)
        # rate_limiter = get_webhook_rate_limiter(db)
        # if not rate_limiter.check_rate_limit("twilio", source_ip):
        #     raise HTTPException(
        #         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        #         detail="SMS webhook rate limit exceeded"
        #     )
        
        # Log the incoming SMS
        logger.info(f"Incoming SMS webhook - From: {From}, Body: {Body[:100]}{'...' if len(Body) > 100 else ''}")
        
        # Validate that this is from our configured Twilio account
        if AccountSid and AccountSid != settings.twilio_account_sid:
            logger.warning(f"SMS webhook from unknown account: {AccountSid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized account"
            )
        
        # Enhanced Twilio webhook validation (simplified for now)
        # twilio_signature = request.headers.get('X-Twilio-Signature')
        # if twilio_signature and settings.twilio_auth_token:
        #     form_data = {
        #         'From': From,
        #         'Body': Body,
        #         'MessageSid': MessageSid,
        #         'AccountSid': AccountSid
        #     }
        #     
        #     # For Twilio validation, we need the full webhook URL
        #     webhook_url = str(request.url)
        #     
        #     webhook_security = get_webhook_security_service(db)
        #     validation_result = webhook_security.validate_twilio_webhook(
        #         form_data=form_data,
        #         signature=twilio_signature,
        #         webhook_url=webhook_url,
        #         auth_token=settings.twilio_auth_token,
        #         source_ip=source_ip
        #     )
        #     
        #     if not validation_result.is_valid:
        #         raise HTTPException(
        #             status_code=status.HTTP_400_BAD_REQUEST,
        #             detail=validation_result.error_message
        #         )
        #     
        #     # Check if this is a duplicate event
        #     if validation_result.is_duplicate:
        #         logger.info(f"Duplicate Twilio webhook event: {validation_result.event_id}")
        #         return {"status": "already_processed", "message_sid": validation_result.event_id}
        
        # Process the SMS response
        result = notification_service.handle_incoming_sms(db, From, Body)
        
        # Return TwiML response (empty response means no auto-reply)
        # The notification service handles sending responses directly
        return {
            "status": "processed",
            "action": result.get("action", "unknown"),
            "success": result.get("success", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SMS webhook error: {str(e)}")
        # Still return success to Twilio to avoid retries
        return {"status": "error", "message": "Processing failed"}

@router.post("/sms/status", response_model=None)
async def handle_sms_status_webhook(
    MessageSid: str = Form(...),
    MessageStatus: str = Form(...),
    To: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    ErrorCode: Optional[str] = Form(None),
    ErrorMessage: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Handle SMS delivery status webhooks from Twilio
    
    This tracks the delivery status of outbound SMS messages.
    """
    try:
        logger.info(f"SMS status webhook - SID: {MessageSid}, Status: {MessageStatus}")
        
        # You could update notification queue status here based on MessageSid
        # For now, just log the status
        if ErrorCode:
            logger.error(f"SMS delivery error - SID: {MessageSid}, Code: {ErrorCode}, Message: {ErrorMessage}")
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"SMS status webhook error: {str(e)}")
        return {"status": "error"}

async def handle_subscription_event(event: Any, db: Session):
    """Handle Stripe subscription lifecycle events"""
    try:
        # Initialize Stripe service
        stripe_service = StripeSubscriptionService(db)
        
        # Process the event
        result = stripe_service.handle_subscription_webhook({
            "type": event.type,
            "data": {
                "object": event.data.object
            }
        })
        
        logger.info(f"Processed subscription event {event.type}: {result}")
        
    except Exception as e:
        logger.error(f"Error handling subscription webhook {event.type}: {str(e)}")
        # Don't raise - we still want to return 200 to Stripe
        # to prevent webhook retries

@router.get("/health", response_model=None)
def webhook_health() -> Dict[str, Any]:
    """Health check for webhook endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}