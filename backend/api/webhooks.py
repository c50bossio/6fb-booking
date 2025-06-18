"""
Webhook handlers for Trafft real-time sync
Processes incoming webhook events from Trafft and updates local data
"""
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import json
import logging
from datetime import datetime
from typing import Dict, Any
import hashlib
import hmac

from ..services.trafft_data_mapper import TrafftDataMapper
from ..services.sixfb_calculator import SixFBCalculator
from ..models.appointment import Appointment
from ..models.client import Client
from ..config.database import get_db
from ..config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Webhook signature verification
def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify webhook signature from Trafft"""
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Trafft sends signature as 'sha256=<hash>'
    if signature.startswith('sha256='):
        signature = signature[7:]
    
    return hmac.compare_digest(expected_signature, signature)

@router.post("/trafft")
async def handle_trafft_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Handle incoming webhooks from Trafft
    Processes appointment, customer, and payment events
    """
    try:
        # Get raw payload and signature
        payload = await request.body()
        signature = request.headers.get('X-Trafft-Signature', '')
        
        # Verify signature if webhook secret is configured
        webhook_secret = getattr(settings, 'TRAFFT_WEBHOOK_SECRET', None)
        if webhook_secret and not verify_webhook_signature(payload, signature, webhook_secret):
            logger.warning("Invalid webhook signature received")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse webhook data
        try:
            webhook_data = json.loads(payload)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in webhook payload")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        event_type = webhook_data.get('event')
        event_data = webhook_data.get('data', {})
        
        logger.info(f"Received Trafft webhook: {event_type}")
        
        # Process webhook in background to return quickly
        background_tasks.add_task(process_webhook_event, event_type, event_data)
        
        return JSONResponse(
            status_code=200,
            content={"status": "received", "event": event_type}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def process_webhook_event(event_type: str, event_data: Dict[str, Any]):
    """Process webhook event in background"""
    try:
        mapper = TrafftDataMapper()
        
        if event_type == "appointment.created":
            await handle_appointment_created(event_data, mapper)
        elif event_type == "appointment.updated":
            await handle_appointment_updated(event_data, mapper)
        elif event_type == "appointment.cancelled":
            await handle_appointment_cancelled(event_data, mapper)
        elif event_type == "appointment.completed":
            await handle_appointment_completed(event_data, mapper)
        elif event_type == "customer.created":
            await handle_customer_created(event_data, mapper)
        elif event_type == "customer.updated":
            await handle_customer_updated(event_data, mapper)
        elif event_type == "payment.completed":
            await handle_payment_completed(event_data, mapper)
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
            
    except Exception as e:
        logger.error(f"Error processing webhook event {event_type}: {e}")

async def handle_appointment_created(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle new appointment creation from Trafft"""
    try:
        # Map Trafft appointment to 6FB format
        appointment_data = mapper.map_appointment(event_data)
        
        # Check if customer exists, create if needed
        customer_data = event_data.get('customer', {})
        if customer_data:
            await handle_customer_upsert(customer_data, mapper)
        
        # Create appointment in local database
        db = next(get_db())
        appointment = Appointment(**appointment_data)
        db.add(appointment)
        db.commit()
        
        logger.info(f"Created appointment {appointment.id} from Trafft webhook")
        
        # Trigger 6FB score recalculation
        calculator = SixFBCalculator(db)
        await calculator.recalculate_scores(appointment.barber_id)
        
    except Exception as e:
        logger.error(f"Error handling appointment creation: {e}")

async def handle_appointment_updated(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle appointment updates from Trafft"""
    try:
        trafft_id = event_data.get('id')
        if not trafft_id:
            return
        
        db = next(get_db())
        appointment = db.query(Appointment).filter(
            Appointment.trafft_id == trafft_id
        ).first()
        
        if not appointment:
            # Appointment doesn't exist locally, create it
            await handle_appointment_created(event_data, mapper)
            return
        
        # Update appointment with new data
        appointment_data = mapper.map_appointment(event_data)
        for key, value in appointment_data.items():
            if hasattr(appointment, key):
                setattr(appointment, key, value)
        
        appointment.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Updated appointment {appointment.id} from Trafft webhook")
        
        # Trigger 6FB score recalculation
        calculator = SixFBCalculator(db)
        await calculator.recalculate_scores(appointment.barber_id)
        
    except Exception as e:
        logger.error(f"Error handling appointment update: {e}")

async def handle_appointment_cancelled(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle appointment cancellation from Trafft"""
    try:
        trafft_id = event_data.get('id')
        if not trafft_id:
            return
        
        db = next(get_db())
        appointment = db.query(Appointment).filter(
            Appointment.trafft_id == trafft_id
        ).first()
        
        if appointment:
            appointment.status = "cancelled"
            appointment.cancelled_at = datetime.utcnow()
            appointment.updated_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Cancelled appointment {appointment.id} from Trafft webhook")
            
            # Trigger 6FB score recalculation
            calculator = SixFBCalculator(db)
            await calculator.recalculate_scores(appointment.barber_id)
        
    except Exception as e:
        logger.error(f"Error handling appointment cancellation: {e}")

async def handle_appointment_completed(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle appointment completion from Trafft"""
    try:
        trafft_id = event_data.get('id')
        if not trafft_id:
            return
        
        db = next(get_db())
        appointment = db.query(Appointment).filter(
            Appointment.trafft_id == trafft_id
        ).first()
        
        if appointment:
            # Update appointment with completion data
            appointment_data = mapper.map_appointment(event_data)
            for key, value in appointment_data.items():
                if hasattr(appointment, key):
                    setattr(appointment, key, value)
            
            appointment.status = "completed"
            appointment.completed_at = datetime.utcnow()
            appointment.updated_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Completed appointment {appointment.id} from Trafft webhook")
            
            # Trigger 6FB score recalculation
            calculator = SixFBCalculator(db)
            await calculator.recalculate_scores(appointment.barber_id)
        
    except Exception as e:
        logger.error(f"Error handling appointment completion: {e}")

async def handle_customer_created(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle new customer creation from Trafft"""
    await handle_customer_upsert(event_data, mapper, is_new=True)

async def handle_customer_updated(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle customer updates from Trafft"""
    await handle_customer_upsert(event_data, mapper, is_new=False)

async def handle_customer_upsert(event_data: Dict[str, Any], mapper: TrafftDataMapper, is_new: bool = None):
    """Handle customer creation or update"""
    try:
        trafft_id = event_data.get('id')
        if not trafft_id:
            return
        
        # Map Trafft customer to 6FB format
        customer_data = mapper.map_customer(event_data)
        
        db = next(get_db())
        customer = db.query(Client).filter(
            Client.trafft_id == trafft_id
        ).first()
        
        if customer:
            # Update existing customer
            for key, value in customer_data.items():
                if hasattr(customer, key):
                    setattr(customer, key, value)
            customer.updated_at = datetime.utcnow()
            action = "updated"
        else:
            # Create new customer
            customer = Client(**customer_data)
            db.add(customer)
            action = "created"
        
        db.commit()
        logger.info(f"{action.capitalize()} customer {customer.id} from Trafft webhook")
        
    except Exception as e:
        logger.error(f"Error handling customer upsert: {e}")

async def handle_payment_completed(event_data: Dict[str, Any], mapper: TrafftDataMapper):
    """Handle payment completion from Trafft"""
    try:
        appointment_id = event_data.get('appointmentId')
        if not appointment_id:
            return
        
        db = next(get_db())
        appointment = db.query(Appointment).filter(
            Appointment.trafft_id == appointment_id
        ).first()
        
        if appointment:
            # Update payment information
            payment_data = mapper.map_payment(event_data)
            
            if 'service_revenue' in payment_data:
                appointment.service_revenue = payment_data['service_revenue']
            if 'tip_amount' in payment_data:
                appointment.tip_amount = payment_data['tip_amount']
            if 'product_revenue' in payment_data:
                appointment.product_revenue = payment_data['product_revenue']
            
            appointment.payment_status = "completed"
            appointment.updated_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Updated payment for appointment {appointment.id} from Trafft webhook")
            
            # Trigger 6FB score recalculation
            calculator = SixFBCalculator(db)
            await calculator.recalculate_scores(appointment.barber_id)
        
    except Exception as e:
        logger.error(f"Error handling payment completion: {e}")

# Health check endpoint for webhook monitoring
@router.get("/health")
async def webhook_health():
    """Health check endpoint for webhook monitoring"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Webhook registration status
@router.get("/status")
async def webhook_status():
    """Get webhook registration status"""
    try:
        from ..services.trafft_client import get_trafft_client
        
        async with await get_trafft_client() as client:
            webhooks = await client.get_webhooks()
            
        return {
            "status": "active" if webhooks else "inactive",
            "webhooks_registered": len(webhooks),
            "events_listening": [
                "appointment.created", "appointment.updated", 
                "appointment.cancelled", "appointment.completed",
                "customer.created", "customer.updated", "payment.completed"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting webhook status: {e}")
        return {"status": "error", "message": str(e)}