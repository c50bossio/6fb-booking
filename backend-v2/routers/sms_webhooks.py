from fastapi import APIRouter, Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from twilio.request_validator import RequestValidator
from datetime import datetime
import logging
from typing import Dict, Any

from db import get_db
from config import settings
from models import (
    SMSConversation, SMSMessage, SMSMessageDirection, 
    SMSMessageStatus, Client
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/sms", tags=["sms_webhooks"])

# Initialize Twilio webhook validator
twilio_validator = RequestValidator(settings.twilio_auth_token) if settings.twilio_auth_token else None

@router.post("/incoming")
async def handle_incoming_sms(request: Request, db: Session = Depends(get_db)):
    """
    Handle incoming SMS messages from Twilio webhook
    This receives REAL customer text messages sent to the business phone number
    """
    try:
        # Get form data from Twilio webhook
        form_data = await request.form()
        webhook_data = dict(form_data)
        
        logger.info(f"Received incoming SMS webhook: {webhook_data}")
        
        # Validate webhook signature (security)
        if twilio_validator and settings.twilio_webhook_validate:
            url = str(request.url)
            signature = request.headers.get('X-Twilio-Signature', '')
            
            if not twilio_validator.validate(url, webhook_data, signature):
                logger.warning(f"Invalid Twilio webhook signature for incoming SMS")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Invalid webhook signature"
                )
        
        # Extract message data
        from_phone = webhook_data.get('From', '').strip()
        to_phone = webhook_data.get('To', '').strip()
        body = webhook_data.get('Body', '').strip()
        message_sid = webhook_data.get('MessageSid', '')
        
        if not from_phone or not to_phone or not body:
            logger.error(f"Missing required fields in SMS webhook: {webhook_data}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required SMS fields"
            )
        
        # Process the incoming customer message
        conversation, message = await process_incoming_customer_message(
            db=db,
            customer_phone=from_phone,
            business_phone=to_phone,
            message_body=body,
            twilio_sid=message_sid,
            webhook_data=webhook_data
        )
        
        logger.info(f"Processed incoming SMS from {from_phone}: {len(body)} characters")
        
        # Return TwiML response (Twilio expects this)
        return {"status": "received", "conversation_id": conversation.id, "message_id": message.id}
        
    except Exception as e:
        logger.error(f"Error processing incoming SMS webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process incoming SMS"
        )

@router.post("/status")
async def handle_sms_status(request: Request, db: Session = Depends(get_db)):
    """
    Handle SMS delivery status updates from Twilio
    Tracks when messages are delivered, failed, etc.
    """
    try:
        form_data = await request.form()
        status_data = dict(form_data)
        
        logger.info(f"Received SMS status webhook: {status_data}")
        
        # Validate webhook signature
        if twilio_validator and settings.twilio_webhook_validate:
            url = str(request.url)
            signature = request.headers.get('X-Twilio-Signature', '')
            
            if not twilio_validator.validate(url, status_data, signature):
                logger.warning(f"Invalid Twilio webhook signature for SMS status")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="Invalid webhook signature"
                )
        
        # Extract status data
        message_sid = status_data.get('MessageSid', '')
        message_status = status_data.get('MessageStatus', '').lower()
        error_code = status_data.get('ErrorCode')
        error_message = status_data.get('ErrorMessage')
        
        if not message_sid or not message_status:
            logger.error(f"Missing required fields in SMS status webhook: {status_data}")
            return {"status": "ignored"}
        
        # Update message status in database
        await update_message_delivery_status(
            db=db,
            twilio_sid=message_sid,
            status=message_status,
            error_code=error_code,
            error_message=error_message,
            webhook_data=status_data
        )
        
        logger.info(f"Updated SMS status for {message_sid}: {message_status}")
        
        return {"status": "processed", "message_sid": message_sid}
        
    except Exception as e:
        logger.error(f"Error processing SMS status webhook: {str(e)}")
        return {"status": "error", "error": str(e)}

async def process_incoming_customer_message(
    db: Session,
    customer_phone: str,
    business_phone: str,
    message_body: str,
    twilio_sid: str,
    webhook_data: Dict[str, Any]
) -> tuple[SMSConversation, SMSMessage]:
    """
    Process an incoming SMS from a customer to the business
    Creates or updates conversation thread and stores the message
    """
    
    # Find or create conversation thread
    conversation = db.query(SMSConversation).filter(
        SMSConversation.customer_phone == customer_phone
    ).first()
    
    if not conversation:
        # Create new conversation thread
        # Try to find existing client by phone number
        client = db.query(Client).filter(Client.phone == customer_phone).first()
        
        conversation = SMSConversation(
            customer_phone=customer_phone,
            customer_name=f"{client.first_name} {client.last_name}" if client else None,
            client_id=client.id if client else None,
            status="active",
            total_messages=0,
            unread_customer_messages=0
        )
        db.add(conversation)
        db.flush()  # Get the ID
        
        logger.info(f"Created new SMS conversation for customer {customer_phone}")
    
    # Create the message record
    message = SMSMessage(
        conversation_id=conversation.id,
        body=message_body,
        direction=SMSMessageDirection.INBOUND,
        from_phone=customer_phone,
        to_phone=business_phone,
        twilio_sid=twilio_sid,
        status=SMSMessageStatus.DELIVERED,  # Incoming messages are delivered by definition
        delivered_at=datetime.utcnow(),
        message_metadata=webhook_data
    )
    db.add(message)
    
    # Update conversation metadata
    conversation.last_message_at = datetime.utcnow()
    conversation.last_message_from = "customer"
    conversation.total_messages += 1
    conversation.unread_customer_messages += 1
    conversation.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(conversation)
    db.refresh(message)
    
    logger.info(f"Stored incoming SMS message from {customer_phone}: '{message_body[:50]}...'")
    
    return conversation, message

async def update_message_delivery_status(
    db: Session,
    twilio_sid: str,
    status: str,
    error_code: str = None,
    error_message: str = None,
    webhook_data: Dict[str, Any] = None
):
    """
    Update delivery status for an outbound SMS message
    """
    
    message = db.query(SMSMessage).filter(
        SMSMessage.twilio_sid == twilio_sid
    ).first()
    
    if not message:
        logger.warning(f"No message found for Twilio SID: {twilio_sid}")
        return
    
    # Map Twilio status to our enum
    status_mapping = {
        "queued": SMSMessageStatus.QUEUED,
        "sent": SMSMessageStatus.SENT,
        "delivered": SMSMessageStatus.DELIVERED,
        "failed": SMSMessageStatus.FAILED,
        "undelivered": SMSMessageStatus.FAILED
    }
    
    new_status = status_mapping.get(status, SMSMessageStatus.QUEUED)
    message.status = new_status
    
    # Update timestamps based on status
    if status == "sent":
        message.sent_at = datetime.utcnow()
    elif status in ["delivered", "undelivered"]:
        message.delivered_at = datetime.utcnow()
    elif status == "failed":
        message.failed_at = datetime.utcnow()
        message.error_code = error_code
        message.error_message = error_message
    
    # Update metadata
    if webhook_data:
        current_metadata = message.message_metadata or {}
        current_metadata.update({"status_webhook": webhook_data})
        message.message_metadata = current_metadata
    
    message.updated_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Updated SMS message {twilio_sid} status to {status}")

@router.get("/test")
async def test_webhook_endpoint():
    """
    Test endpoint to verify webhook configuration
    """
    return {
        "status": "ok",
        "message": "SMS webhook endpoint is working",
        "timestamp": datetime.utcnow().isoformat(),
        "webhook_validation": twilio_validator is not None
    }