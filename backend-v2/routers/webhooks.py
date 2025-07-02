"""
Webhook handlers for payment processing and SMS responses
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, Form
from sqlalchemy.orm import Session
import stripe
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from database import get_db
from config import settings
from models import Payment, Refund, Payout
from services.payment_security import PaymentSecurity, audit_logger
from services.notification_service import notification_service
from utils.idempotency import webhook_idempotent

router = APIRouter(
    prefix="/webhooks",
    tags=["webhooks"]
)

logger = logging.getLogger(__name__)

@router.post("/stripe")
@webhook_idempotent(
    operation_type="stripe",
    ttl_hours=48,
    event_id_header="stripe-request-id"
)
async def handle_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhook events"""
    try:
        # Get the raw payload
        payload = await request.body()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
            )
        
        # Verify webhook signature
        if not PaymentSecurity.verify_webhook_signature(
            payload, signature, settings.stripe_webhook_secret
        ):
            audit_logger.log_security_violation(
                None, "invalid_webhook_signature", 
                f"Invalid webhook signature from IP: {request.client.host}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
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

@router.post("/sms")
@webhook_idempotent(
    operation_type="sms",
    ttl_hours=24,
    event_id_header="MessageSid"
)
async def handle_sms_webhook(
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: Optional[str] = Form(None),
    AccountSid: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Handle incoming SMS webhooks from Twilio
    
    This endpoint processes two-way SMS communication for appointment management.
    Twilio sends form-encoded data with From, Body, and other parameters.
    """
    try:
        # Log the incoming SMS
        logger.info(f"Incoming SMS webhook - From: {From}, Body: {Body[:100]}{'...' if len(Body) > 100 else ''}")
        
        # Validate that this is from our configured Twilio account
        if AccountSid and AccountSid != settings.twilio_account_sid:
            logger.warning(f"SMS webhook from unknown account: {AccountSid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized account"
            )
        
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

@router.post("/sms/status")
async def handle_sms_status_webhook(
    MessageSid: str = Form(...),
    MessageStatus: str = Form(...),
    To: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    ErrorCode: Optional[str] = Form(None),
    ErrorMessage: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
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

@router.get("/health")
def webhook_health():
    """Health check for webhook endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}