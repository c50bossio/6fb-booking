"""
Payment Webhook Queue Worker for BookedBarber V2
Handles Stripe webhook processing and payment-related async tasks
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from celery import Celery
from datetime import datetime, timedelta
import logging
import json
import stripe
from contextlib import contextmanager
from typing import Dict, Any, Optional

from db import SessionLocal
from config import settings
from models import User, Appointment, Payment
from models.message_queue import MessageQueue, MessageStatus, MessageQueueType, MessagePriority
from services.payment_service import payment_service
from services.notification_service import notification_service
from services.sentry_monitoring import celery_monitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

# Import Sentry monitoring if available
try:
    SENTRY_MONITORING_AVAILABLE = True
except ImportError:
    SENTRY_MONITORING_AVAILABLE = False


@contextmanager
def get_db_session():
    """Context manager for database sessions"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def monitor_task(task_name: str):
    """Decorator for monitoring tasks with Sentry"""
    def decorator(func):
        if SENTRY_MONITORING_AVAILABLE:
            return celery_monitor.monitor_task_execution(task_name)(func)
        return func
    return decorator


# Import from main celery app
from celery_app import celery_app


@celery_app.task(bind=True, max_retries=5)
@monitor_task("process_stripe_webhook")
def process_stripe_webhook(self, webhook_payload: Dict[str, Any], signature: str, endpoint_secret: str):
    """
    Process Stripe webhook events with proper verification and handling
    """
    try:
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                json.dumps(webhook_payload),
                signature,
                endpoint_secret
            )
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise Exception(f"Invalid webhook signature: {e}")
        
        event_type = event['type']
        event_data = event['data']['object']
        
        logger.info(f"Processing Stripe webhook: {event_type} - {event['id']}")
        
        with get_db_session() as db:
            # Route to appropriate handler based on event type
            if event_type.startswith('payment_intent.'):
                result = _handle_payment_intent_event(db, event_type, event_data, event['id'])
            elif event_type.startswith('invoice.'):
                result = _handle_invoice_event(db, event_type, event_data, event['id'])
            elif event_type.startswith('customer.subscription.'):
                result = _handle_subscription_event(db, event_type, event_data, event['id'])
            elif event_type.startswith('checkout.session.'):
                result = _handle_checkout_session_event(db, event_type, event_data, event['id'])
            elif event_type in ['charge.dispute.created', 'charge.dispute.updated']:
                result = _handle_dispute_event(db, event_type, event_data, event['id'])
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                result = {"status": "ignored", "event_type": event_type}
            
            logger.info(f"Webhook processed successfully: {result}")
            return result
            
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        
        # Retry with exponential backoff for transient errors
        if self.request.retries < self.max_retries:
            countdown = min(60 * (2 ** self.request.retries), 3600)  # Max 1 hour
            logger.info(f"Retrying webhook processing in {countdown} seconds...")
            raise self.retry(countdown=countdown, exc=e)
        else:
            logger.error(f"Max retries exceeded for webhook processing")
            # Send to dead letter queue for manual review
            _send_to_dead_letter_queue(webhook_payload, str(e))
            raise


def _handle_payment_intent_event(db, event_type: str, payment_intent: Dict[str, Any], event_id: str) -> Dict[str, Any]:
    """Handle payment intent events"""
    payment_intent_id = payment_intent['id']
    
    if event_type == 'payment_intent.succeeded':
        return _process_payment_success(db, payment_intent, event_id)
    elif event_type == 'payment_intent.payment_failed':
        return _process_payment_failure(db, payment_intent, event_id)
    elif event_type == 'payment_intent.requires_action':
        return _handle_payment_action_required(db, payment_intent, event_id)
    else:
        return {"status": "ignored", "event_type": event_type}


def _handle_invoice_event(db, event_type: str, invoice: Dict[str, Any], event_id: str) -> Dict[str, Any]:
    """Handle invoice events for subscriptions"""
    invoice_id = invoice['id']
    
    if event_type == 'invoice.payment_succeeded':
        return _process_subscription_payment_success(db, invoice, event_id)
    elif event_type == 'invoice.payment_failed':
        return _process_subscription_payment_failure(db, invoice, event_id)
    else:
        return {"status": "ignored", "event_type": event_type}


@celery_app.task(bind=True, max_retries=3)
@monitor_task("process_payment_success")
def process_payment_success(self, payment_intent_data: Dict[str, Any], event_id: str):
    """
    Process successful payment
    """
    try:
        with get_db_session() as db:
            return _process_payment_success(db, payment_intent_data, event_id)
    except Exception as e:
        logger.error(f"Error processing payment success: {e}")
        if self.request.retries < self.max_retries:
            countdown = 30 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


def _process_payment_success(db, payment_intent: Dict[str, Any], event_id: str) -> Dict[str, Any]:
    """Process successful payment intent"""
    payment_intent_id = payment_intent['id']
    amount = payment_intent['amount']
    currency = payment_intent['currency']
    customer_id = payment_intent.get('customer')
    
    # Find the associated appointment/booking
    appointment = None
    if payment_intent.get('metadata', {}).get('appointment_id'):
        appointment_id = payment_intent['metadata']['appointment_id']
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    # Update payment record
    payment_record = payment_service.update_payment_status(
        db=db,
        payment_intent_id=payment_intent_id,
        status='completed',
        metadata={'stripe_event_id': event_id}
    )
    
    if appointment:
        # Update appointment status
        appointment.payment_status = 'paid'
        appointment.status = 'confirmed'
        db.commit()
        
        # Queue confirmation notification
        notification_service.queue_notification(
            db=db,
            user=appointment.user,
            template_name="payment_confirmation",
            context={
                "appointment_id": appointment.id,
                "amount": amount / 100,  # Convert from cents
                "currency": currency.upper(),
                "service_name": appointment.service_name,
                "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
                "appointment_time": appointment.start_time.strftime("%I:%M %p")
            },
            appointment_id=appointment.id
        )
        
        # Queue booking confirmation notification
        notification_service.queue_notification(
            db=db,
            user=appointment.user,
            template_name="booking_confirmation",
            context={
                "appointment_id": appointment.id,
                "service_name": appointment.service_name,
                "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
                "appointment_time": appointment.start_time.strftime("%I:%M %p"),
                "barber_name": appointment.barber.name if appointment.barber else "Your barber"
            },
            appointment_id=appointment.id
        )
    
    logger.info(f"Payment success processed: {payment_intent_id}")
    return {
        "status": "success",
        "payment_intent_id": payment_intent_id,
        "appointment_id": appointment.id if appointment else None,
        "amount": amount,
        "currency": currency
    }


@celery_app.task(bind=True, max_retries=3)
@monitor_task("process_payment_failure")
def process_payment_failure(self, payment_intent_data: Dict[str, Any], event_id: str):
    """
    Process failed payment
    """
    try:
        with get_db_session() as db:
            return _process_payment_failure(db, payment_intent_data, event_id)
    except Exception as e:
        logger.error(f"Error processing payment failure: {e}")
        if self.request.retries < self.max_retries:
            countdown = 30 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


def _process_payment_failure(db, payment_intent: Dict[str, Any], event_id: str) -> Dict[str, Any]:
    """Process failed payment intent"""
    payment_intent_id = payment_intent['id']
    failure_reason = payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')
    
    # Find the associated appointment
    appointment = None
    if payment_intent.get('metadata', {}).get('appointment_id'):
        appointment_id = payment_intent['metadata']['appointment_id']
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    # Update payment record
    payment_record = payment_service.update_payment_status(
        db=db,
        payment_intent_id=payment_intent_id,
        status='failed',
        metadata={'stripe_event_id': event_id, 'failure_reason': failure_reason}
    )
    
    if appointment:
        # Update appointment status
        appointment.payment_status = 'failed'
        appointment.status = 'pending_payment'
        db.commit()
        
        # Queue payment failure notification
        notification_service.queue_notification(
            db=db,
            user=appointment.user,
            template_name="payment_failed",
            context={
                "appointment_id": appointment.id,
                "service_name": appointment.service_name,
                "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
                "appointment_time": appointment.start_time.strftime("%I:%M %p"),
                "failure_reason": failure_reason,
                "retry_payment_url": f"{settings.frontend_url}/appointments/{appointment.id}/payment"
            },
            appointment_id=appointment.id
        )
    
    logger.warning(f"Payment failure processed: {payment_intent_id} - {failure_reason}")
    return {
        "status": "failed",
        "payment_intent_id": payment_intent_id,
        "appointment_id": appointment.id if appointment else None,
        "failure_reason": failure_reason
    }


@celery_app.task(bind=True, max_retries=3)
@monitor_task("handle_subscription_changes")
def handle_subscription_changes(self, subscription_data: Dict[str, Any], event_type: str, event_id: str):
    """
    Handle subscription lifecycle events
    """
    try:
        with get_db_session() as db:
            subscription_id = subscription_data['id']
            customer_id = subscription_data['customer']
            status = subscription_data['status']
            
            # Find user by Stripe customer ID
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if not user:
                logger.warning(f"User not found for customer ID: {customer_id}")
                return {"status": "user_not_found", "customer_id": customer_id}
            
            # Update user subscription status
            user.subscription_status = status
            user.subscription_id = subscription_id
            
            if event_type == 'customer.subscription.created':
                user.subscription_start_date = datetime.utcnow()
                notification_template = "subscription_activated"
            elif event_type == 'customer.subscription.updated':
                notification_template = "subscription_updated"
            elif event_type == 'customer.subscription.deleted':
                user.subscription_end_date = datetime.utcnow()
                notification_template = "subscription_cancelled"
            
            db.commit()
            
            # Queue notification
            notification_service.queue_notification(
                db=db,
                user=user,
                template_name=notification_template,
                context={
                    "subscription_id": subscription_id,
                    "status": status,
                    "user_name": user.name
                }
            )
            
            logger.info(f"Subscription {event_type} processed for user {user.id}")
            return {
                "status": "success",
                "event_type": event_type,
                "user_id": user.id,
                "subscription_status": status
            }
            
    except Exception as e:
        logger.error(f"Error handling subscription changes: {e}")
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


@celery_app.task(bind=True, max_retries=3)
@monitor_task("process_refund")
def process_refund(self, refund_data: Dict[str, Any], event_id: str):
    """
    Process refund events
    """
    try:
        with get_db_session() as db:
            refund_id = refund_data['id']
            payment_intent_id = refund_data['payment_intent']
            amount = refund_data['amount']
            status = refund_data['status']
            
            # Find associated payment and appointment
            payment_record = payment_service.get_payment_by_intent_id(db, payment_intent_id)
            if not payment_record:
                logger.warning(f"Payment not found for refund: {refund_id}")
                return {"status": "payment_not_found", "refund_id": refund_id}
            
            # Update payment record with refund info
            payment_service.record_refund(
                db=db,
                payment_id=payment_record.id,
                refund_id=refund_id,
                amount=amount,
                status=status,
                metadata={'stripe_event_id': event_id}
            )
            
            # Find appointment and update status
            appointment = db.query(Appointment).filter(
                Appointment.id == payment_record.appointment_id
            ).first()
            
            if appointment:
                appointment.payment_status = 'refunded'
                appointment.status = 'cancelled'
                db.commit()
                
                # Queue refund notification
                notification_service.queue_notification(
                    db=db,
                    user=appointment.user,
                    template_name="refund_processed",
                    context={
                        "appointment_id": appointment.id,
                        "refund_amount": amount / 100,  # Convert from cents
                        "service_name": appointment.service_name,
                        "appointment_date": appointment.start_time.strftime("%B %d, %Y"),
                        "refund_id": refund_id
                    },
                    appointment_id=appointment.id
                )
            
            logger.info(f"Refund processed: {refund_id} for payment {payment_intent_id}")
            return {
                "status": "success",
                "refund_id": refund_id,
                "payment_intent_id": payment_intent_id,
                "amount": amount,
                "appointment_id": appointment.id if appointment else None
            }
            
    except Exception as e:
        logger.error(f"Error processing refund: {e}")
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=e)
        else:
            raise


def _send_to_dead_letter_queue(webhook_payload: Dict[str, Any], error_message: str):
    """Send failed webhook to dead letter queue for manual review"""
    try:
        with get_db_session() as db:
            # Create dead letter queue entry
            from models.message_queue import DeadLetterQueue, MessageQueueType, MessagePriority
            
            dlq_entry = DeadLetterQueue(
                original_task_name="process_stripe_webhook",
                original_task_args=[webhook_payload],
                original_task_kwargs={},
                original_queue_type=MessageQueueType.PAYMENT_WEBHOOK,
                original_priority=MessagePriority.CRITICAL,
                failure_reason="Webhook processing failed after max retries",
                final_error_message=error_message,
                total_attempts=5,
                manual_review_required=True,
                can_be_retried=True
            )
            
            db.add(dlq_entry)
            db.commit()
            
            logger.error(f"Webhook sent to dead letter queue: {dlq_entry.id}")
            
    except Exception as e:
        logger.error(f"Failed to send webhook to dead letter queue: {e}")


# Health check task
@celery_app.task
def payment_worker_health_check():
    """Health check for payment worker"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "worker_type": "payment_worker",
        "stripe_configured": bool(settings.stripe_secret_key),
        "worker_id": os.getpid()
    }