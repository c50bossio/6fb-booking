"""
Enhanced webhook handlers with robust error handling and transaction management
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, Form
from sqlalchemy.orm import Session
import stripe
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio

from database import get_db
from config import settings
from models import Payment, Refund, Payout, Organization, Appointment, WebhookEvent
from sqlalchemy import Integer
from services.payment_security import PaymentSecurity, audit_logger
from services.notification_service import notification_service
from services.webhook_security import get_webhook_security_service, get_webhook_rate_limiter
from services.stripe_service import StripeSubscriptionService
from utils.idempotency import webhook_idempotent
from utils.database_utils import (
    WebhookTransactionManager, db_transaction, transactional,
    RetryableError, TransactionError, safe_db_operation
)
from utils.security_logging import get_security_logger, SecurityEventType

router = APIRouter(
    prefix="/webhooks",
    tags=["webhooks"]
)

logger = logging.getLogger(__name__)
security_logger = None  # Lazy load when needed


@router.post("/stripe", response_model=None)
async def handle_stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Handle Stripe webhook events with enhanced security and error recovery"""
    webhook_manager = WebhookTransactionManager(db)
    
    try:
        # Get client IP
        source_ip = request.client.host if request.client else "unknown"
        
        # Get the raw payload
        payload = await request.body()
        signature = request.headers.get('stripe-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
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
        
        # Process webhook with transaction management
        with webhook_manager.process_webhook(
            event_type=event.type,
            event_id=event.id,
            source="stripe",
            payload=event.to_dict()
        ) as ctx:
            # If duplicate, return cached result
            if ctx.is_duplicate:
                return ctx.cached_result or {"status": "already_processed"}
            
            # Route to appropriate handler
            result = await _route_stripe_event(event, db)
            
            # Set result for storage
            ctx.set_result(result)
            
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}", exc_info=True)
        # Return success to prevent Stripe retries for non-retryable errors
        return {"status": "error", "message": "Processing failed"}


async def _route_stripe_event(event: Any, db: Session) -> Dict[str, Any]:
    """Route Stripe events to appropriate handlers"""
    try:
        if event.type == 'payment_intent.succeeded':
            await _handle_payment_intent_succeeded(event.data.object, db)
        elif event.type == 'payment_intent.payment_failed':
            await _handle_payment_intent_failed(event.data.object, db)
        elif event.type == 'charge.dispute.created':
            await _handle_charge_dispute_created(event.data.object, db)
        elif event.type == 'transfer.created':
            await _handle_transfer_created(event.data.object, db)
        elif event.type == 'transfer.failed':
            await _handle_transfer_failed(event.data.object, db)
        elif event.type in [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed'
        ]:
            await _handle_subscription_event(event, db)
        else:
            logger.info(f"Unhandled event type: {event.type}")
            
        return {"status": "success", "event_type": event.type}
        
    except Exception as e:
        logger.error(f"Error routing event {event.type}: {str(e)}")
        raise


@transactional(max_retries=3, retry_delay=2.0)
async def _handle_payment_intent_succeeded(
    payment_intent: Dict[str, Any], 
    db: Session
) -> None:
    """Handle successful payment intent with transaction safety"""
    
    with db_transaction(db) as transaction:
        try:
            # Find the payment record
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent['id']
            ).with_for_update().first()  # Lock row for update
            
            if not payment:
                logger.warning(f"Payment not found for intent: {payment_intent['id']}")
                return
            
            # Skip if already processed
            if payment.status == "completed":
                logger.info(f"Payment {payment.id} already completed, skipping")
                return
            
            # Update payment status
            payment.status = "completed"
            
            # Extract charge ID if available
            charges = payment_intent.get('charges', {}).get('data', [])
            if charges:
                payment.stripe_payment_id = charges[0]['id']
            else:
                payment.stripe_payment_id = payment_intent['id']
            
            # Update appointment status with validation
            if payment.appointment:
                appointment = db.query(Appointment).filter(
                    Appointment.id == payment.appointment_id
                ).with_for_update().first()
                
                if appointment and appointment.status == "pending":
                    appointment.status = "confirmed"
                    
                    # Send confirmation notification
                    try:
                        notification_service.send_appointment_confirmation(
                            db, appointment.id
                        )
                    except Exception as e:
                        # Don't fail the transaction for notification errors
                        logger.error(f"Failed to send confirmation: {str(e)}")
            
            # Audit log
            logger.info(f"Payment {payment.id} confirmed via webhook")
            
            # Security logging
            global security_logger
            if not security_logger:
                security_logger = get_security_logger(db)
            
            security_logger.log_payment_security_event(
                event_type=SecurityEventType.PAYMENT_COMPLETED,
                user_id=payment.user_id,
                amount=payment.amount,
                details={
                    "payment_id": payment.id,
                    "stripe_intent_id": payment_intent['id'],
                    "appointment_id": payment.appointment_id
                }
            )
            
            transaction.commit()
            
        except Exception as e:
            logger.error(f"Error processing payment success: {str(e)}")
            transaction.rollback()
            raise TransactionError(f"Failed to process payment success: {str(e)}")


@transactional(max_retries=3, retry_delay=2.0)
async def _handle_payment_intent_failed(
    payment_intent: Dict[str, Any],
    db: Session
) -> None:
    """Handle failed payment intent with proper error recovery"""
    
    with db_transaction(db) as transaction:
        try:
            # Find the payment record
            payment = db.query(Payment).filter(
                Payment.stripe_payment_intent_id == payment_intent['id']
            ).with_for_update().first()
            
            if not payment:
                logger.warning(f"Payment not found for intent: {payment_intent['id']}")
                return
            
            # Update payment status
            payment.status = "failed"
            
            # Extract failure reason
            last_error = payment_intent.get('last_payment_error', {})
            if last_error and 'message' in last_error:
                payment.failure_reason = last_error['message'][:500]  # Truncate to field limit
            
            # Update appointment status to allow retry
            if payment.appointment:
                appointment = db.query(Appointment).filter(
                    Appointment.id == payment.appointment_id
                ).with_for_update().first()
                
                if appointment:
                    appointment.status = "pending"
                    
                    # Send failure notification
                    try:
                        notification_service.send_payment_failure_notification(
                            db, appointment.id, payment.failure_reason
                        )
                    except Exception as e:
                        logger.error(f"Failed to send failure notification: {str(e)}")
            
            # Security logging
            audit_logger.log_security_violation(
                payment.user_id, "payment_failed",
                f"Payment intent {payment_intent['id']} failed: {payment.failure_reason}"
            )
            
            transaction.commit()
            
        except Exception as e:
            logger.error(f"Error processing payment failure: {str(e)}")
            transaction.rollback()
            raise


async def _handle_charge_dispute_created(
    dispute: Dict[str, Any],
    db: Session
) -> None:
    """Handle charge dispute with proper tracking"""
    
    def process_dispute():
        charge_id = dispute.get('charge')
        if not charge_id:
            return
        
        # Find payment by charge ID
        payment = db.query(Payment).filter(
            Payment.stripe_payment_id == charge_id
        ).with_for_update().first()
        
        if not payment:
            logger.warning(f"Payment not found for disputed charge: {charge_id}")
            return
        
        # Update payment status
        payment.status = "disputed"
        payment.dispute_status = dispute.get('status', 'unknown')
        payment.dispute_reason = dispute.get('reason', 'unknown')
        payment.dispute_amount = dispute.get('amount', 0) / 100  # Convert from cents
        
        # Security event logging
        global security_logger
        if not security_logger:
            security_logger = get_security_logger(db)
            
        security_logger.log_payment_security_event(
            event_type=SecurityEventType.PAYMENT_DISPUTED,
            user_id=payment.user_id,
            amount=payment.dispute_amount,
            risk_factors=["charge_disputed"],
            details={
                "payment_id": payment.id,
                "charge_id": charge_id,
                "dispute_reason": payment.dispute_reason,
                "dispute_status": payment.dispute_status
            }
        )
        
        logger.warning(f"Dispute created for payment {payment.id}, amount: ${payment.dispute_amount}")
    
    safe_db_operation(
        func=process_dispute,
        db=db,
        error_message="Failed to process dispute",
        raise_on_error=False
    )


async def _handle_transfer_created(
    transfer: Dict[str, Any],
    db: Session
) -> None:
    """Handle transfer creation with status tracking"""
    
    with db_transaction(db):
        # Find payout record
        payout = db.query(Payout).filter(
            Payout.stripe_transfer_id == transfer['id']
        ).with_for_update().first()
        
        if payout and transfer.get('status') == 'paid':
            payout.status = "completed"
            payout.paid_at = datetime.utcnow()
            logger.info(f"Transfer {transfer['id']} completed for payout {payout.id}")


async def _handle_transfer_failed(
    transfer: Dict[str, Any],
    db: Session
) -> None:
    """Handle transfer failure with proper error tracking"""
    
    with db_transaction(db):
        # Find payout record
        payout = db.query(Payout).filter(
            Payout.stripe_transfer_id == transfer['id']
        ).with_for_update().first()
        
        if not payout:
            logger.warning(f"Payout not found for failed transfer: {transfer['id']}")
            return
        
        # Update payout status
        payout.status = "failed"
        payout.failure_reason = transfer.get('failure_message', 'Unknown error')[:500]
        
        # Log security event
        audit_logger.log_security_violation(
            payout.barber_id, "payout_failed",
            f"Transfer {transfer['id']} failed: {payout.failure_reason}"
        )
        
        # Notify barber of failure
        try:
            notification_service.send_payout_failure_notification(
                db, payout.id, payout.failure_reason
            )
        except Exception as e:
            logger.error(f"Failed to send payout failure notification: {str(e)}")


async def _handle_subscription_event(event: Any, db: Session) -> None:
    """Handle Stripe subscription lifecycle events"""
    try:
        # Initialize Stripe service
        stripe_service = StripeSubscriptionService(db)
        
        # Process the event with error handling
        result = stripe_service.handle_subscription_webhook({
            "type": event.type,
            "data": {
                "object": event.data.object
            }
        })
        
        logger.info(f"Processed subscription event {event.type}: {result}")
        
    except Exception as e:
        logger.error(f"Error handling subscription webhook {event.type}: {str(e)}")
        # For subscription events, we might want to retry
        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            raise RetryableError(f"Retryable subscription error: {str(e)}")


@router.post("/sms", response_model=None)
async def handle_sms_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: Optional[str] = Form(None),
    AccountSid: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Handle incoming SMS webhooks with enhanced reliability"""
    webhook_manager = WebhookTransactionManager(db)
    
    try:
        # Validate account
        if AccountSid and AccountSid != settings.twilio_account_sid:
            logger.warning(f"SMS webhook from unknown account: {AccountSid}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized account"
            )
        
        # Process with transaction management
        with webhook_manager.process_webhook(
            event_type="sms.received",
            event_id=MessageSid or f"sms_{datetime.utcnow().timestamp()}",
            source="twilio",
            payload={
                "from": From,
                "body": Body,
                "message_sid": MessageSid,
                "account_sid": AccountSid
            }
        ) as ctx:
            if ctx.is_duplicate:
                return ctx.cached_result or {"status": "already_processed"}
            
            # Process the SMS
            result = notification_service.handle_incoming_sms(db, From, Body)
            
            ctx.set_result(result)
            
            return {
                "status": "processed",
                "action": result.get("action", "unknown"),
                "success": result.get("success", False)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SMS webhook error: {str(e)}", exc_info=True)
        # Return success to Twilio to avoid retries
        return {"status": "error", "message": "Processing failed"}


@router.get("/health", response_model=None)
async def webhook_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Enhanced health check with webhook processing stats"""
    try:
        # Get webhook processing stats
        from sqlalchemy import func
        
        stats = db.query(
            func.count(WebhookEvent.id).label("total_events"),
            func.sum(func.cast(WebhookEvent.status == "processed", Integer)).label("processed"),
            func.sum(func.cast(WebhookEvent.status == "failed", Integer)).label("failed"),
            func.sum(func.cast(WebhookEvent.status == "processing", Integer)).label("processing")
        ).first()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "stats": {
                "total_events": stats.total_events or 0,
                "processed": stats.processed or 0,
                "failed": stats.failed or 0,
                "processing": stats.processing or 0
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }