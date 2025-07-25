from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import Optional, List
from datetime import datetime
import logging

from db import get_db
from models import (
    User, SMSConversation, SMSMessage, SMSMessageDirection, 
    SMSMessageStatus, Client
)
from schemas import (
    SMSConversationResponse, SMSMessageResponse, SMSConversationCreate,
    SMSMessageCreate, SMSConversationUpdate
)
from utils.auth import get_current_user
from services.notification_service import notification_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sms", tags=["sms_conversations"])


@router.get("/conversations", response_model=List[SMSConversationResponse])
async def get_sms_conversations(
    limit: int = Query(50, le=200, description="Maximum number of conversations to return"),
    status: Optional[str] = Query(None, description="Filter by conversation status"),
    unread_only: bool = Query(False, description="Only show conversations with unread messages"),
    search: Optional[str] = Query(None, description="Search by phone number or customer name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get SMS conversation threads - shows all ongoing text message conversations with customers
    Each conversation represents a text message thread with a real customer phone number
    """
    query = db.query(SMSConversation)
    
    # Filter by status if provided
    if status:
        query = query.filter(SMSConversation.status == status)
    
    # Filter for unread messages only
    if unread_only:
        query = query.filter(SMSConversation.unread_customer_messages > 0)
    
    # Search functionality
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                SMSConversation.customer_phone.ilike(search_term),
                SMSConversation.customer_name.ilike(search_term)
            )
        )
    
    # If user is a specific barber, only show their assigned conversations
    if current_user.role == 'barber':
        query = query.filter(
            or_(
                SMSConversation.barber_id == current_user.id,
                SMSConversation.barber_id.is_(None)  # Unassigned conversations
            )
        )
    
    conversations = query.order_by(
        desc(SMSConversation.last_message_at),
        desc(SMSConversation.updated_at)
    ).limit(limit).all()
    
    logger.info(f"Retrieved {len(conversations)} SMS conversations for user {current_user.id}")
    
    return conversations


@router.get("/conversations/{conversation_id}", response_model=SMSConversationResponse)
async def get_sms_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific SMS conversation thread with all message details
    """
    conversation = db.query(SMSConversation).filter(
        SMSConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMS conversation not found"
        )
    
    # Check permissions - barbers can only see their assigned conversations
    if current_user.role == 'barber' and conversation.barber_id and conversation.barber_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this conversation"
        )
    
    return conversation


@router.get("/conversations/{conversation_id}/messages", response_model=List[SMSMessageResponse])
async def get_conversation_messages(
    conversation_id: int,
    limit: int = Query(100, le=500, description="Maximum number of messages to return"),
    offset: int = Query(0, description="Number of messages to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages in an SMS conversation thread
    Shows the complete text message history with a customer
    """
    # Verify conversation exists and user has access
    conversation = db.query(SMSConversation).filter(
        SMSConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMS conversation not found"
        )
    
    # Check permissions
    if current_user.role == 'barber' and conversation.barber_id and conversation.barber_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this conversation"
        )
    
    # Get messages
    messages = db.query(SMSMessage).filter(
        SMSMessage.conversation_id == conversation_id
    ).order_by(
        desc(SMSMessage.created_at)
    ).offset(offset).limit(limit).all()
    
    # Mark incoming messages as read
    unread_messages = [m for m in messages if m.direction == SMSMessageDirection.INBOUND and m.read_at is None]
    if unread_messages:
        for message in unread_messages:
            message.read_at = datetime.utcnow()
            message.updated_at = datetime.utcnow()
        
        # Update conversation unread count
        conversation.unread_customer_messages = max(0, conversation.unread_customer_messages - len(unread_messages))
        conversation.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Marked {len(unread_messages)} SMS messages as read in conversation {conversation_id}")
    
    return messages


@router.post("/conversations/{conversation_id}/messages", response_model=SMSMessageResponse)
async def send_sms_message(
    conversation_id: int,
    message_data: SMSMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send an SMS message to a customer - sends a REAL text message to their phone
    This will deliver an actual SMS to the customer's mobile phone
    """
    # Verify conversation exists and user has access
    conversation = db.query(SMSConversation).filter(
        SMSConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMS conversation not found"
        )
    
    # Check permissions
    if current_user.role == 'barber' and conversation.barber_id and conversation.barber_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this conversation"
        )
    
    try:
        # Send the actual SMS using Twilio
        sms_result = notification_service.send_sms(
            to_phone=conversation.customer_phone,
            body=message_data.body
        )
        
        if not sms_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send SMS: {sms_result.get('error', 'Unknown error')}"
            )
        
        # Create message record
        message = SMSMessage(
            conversation_id=conversation_id,
            body=message_data.body,
            direction=SMSMessageDirection.OUTBOUND,
            from_phone=message_data.from_phone,  # Business phone number
            to_phone=conversation.customer_phone,
            twilio_sid=sms_result.get("message_sid"),
            status=SMSMessageStatus.SENT,
            sent_by_user_id=current_user.id,
            sent_at=datetime.utcnow(),
            message_metadata=sms_result
        )
        db.add(message)
        
        # Update conversation
        conversation.last_message_at = datetime.utcnow()
        conversation.last_message_from = "business"
        conversation.total_messages += 1
        conversation.updated_at = datetime.utcnow()
        
        # Assign conversation to current user if unassigned
        if not conversation.barber_id:
            conversation.barber_id = current_user.id
        
        db.commit()
        db.refresh(message)
        
        logger.info(f"Sent SMS to {conversation.customer_phone} by user {current_user.id}: '{message_data.body[:50]}...'")
        
        return message
        
    except Exception as e:
        logger.error(f"Error sending SMS message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send SMS message: {str(e)}"
        )


@router.post("/conversations", response_model=SMSConversationResponse)
async def create_sms_conversation(
    conversation_data: SMSConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new SMS conversation with a customer phone number
    Use this to initiate text messaging with a customer's actual phone number
    """
    # Check if conversation already exists
    existing = db.query(SMSConversation).filter(
        SMSConversation.customer_phone == conversation_data.customer_phone
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMS conversation already exists for this phone number"
        )
    
    # Try to find existing client by phone number
    client = None
    if conversation_data.customer_phone:
        client = db.query(Client).filter(
            Client.phone == conversation_data.customer_phone
        ).first()
    
    # Create new conversation
    conversation = SMSConversation(
        customer_phone=conversation_data.customer_phone,
        customer_name=conversation_data.customer_name or (f"{client.first_name} {client.last_name}" if client else None),
        client_id=client.id if client else None,
        barber_id=current_user.id if current_user.role == 'barber' else None,
        status="active",
        total_messages=0,
        unread_customer_messages=0
    )
    
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    logger.info(f"Created new SMS conversation for {conversation_data.customer_phone} by user {current_user.id}")
    
    return conversation


@router.put("/conversations/{conversation_id}", response_model=SMSConversationResponse)
async def update_sms_conversation(
    conversation_id: int,
    update_data: SMSConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update SMS conversation metadata (status, notes, assigned barber, etc.)
    """
    conversation = db.query(SMSConversation).filter(
        SMSConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMS conversation not found"
        )
    
    # Check permissions
    if current_user.role == 'barber' and conversation.barber_id and conversation.barber_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this conversation"
        )
    
    # Update fields
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(conversation, field, value)
    
    conversation.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(conversation)
    
    logger.info(f"Updated SMS conversation {conversation_id} by user {current_user.id}")
    
    return conversation


@router.delete("/conversations/{conversation_id}")
async def archive_sms_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Archive an SMS conversation (sets status to archived)
    """
    conversation = db.query(SMSConversation).filter(
        SMSConversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMS conversation not found"
        )
    
    # Check permissions - only admins or assigned barber can archive
    if current_user.role not in ['admin'] and conversation.barber_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to archive this conversation"
        )
    
    conversation.status = "archived"
    conversation.updated_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Archived SMS conversation {conversation_id} by user {current_user.id}")
    
    return {"message": "SMS conversation archived successfully"}


@router.get("/stats")
async def get_sms_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get SMS conversation and messaging statistics
    """
    # Base query for user permissions
    conversation_query = db.query(SMSConversation)
    message_query = db.query(SMSMessage)
    
    if current_user.role == 'barber':
        conversation_query = conversation_query.filter(
            or_(
                SMSConversation.barber_id == current_user.id,
                SMSConversation.barber_id.is_(None)
            )
        )
        message_query = message_query.join(SMSConversation).filter(
            or_(
                SMSConversation.barber_id == current_user.id,
                SMSConversation.barber_id.is_(None)
            )
        )
    
    # Get conversation stats
    total_conversations = conversation_query.count()
    active_conversations = conversation_query.filter(SMSConversation.status == "active").count()
    unread_conversations = conversation_query.filter(SMSConversation.unread_customer_messages > 0).count()
    
    # Get message stats
    total_messages = message_query.count()
    inbound_messages = message_query.filter(SMSMessage.direction == SMSMessageDirection.INBOUND).count()
    outbound_messages = message_query.filter(SMSMessage.direction == SMSMessageDirection.OUTBOUND).count()
    
    # Get recent activity
    recent_conversations = conversation_query.filter(
        SMSConversation.last_message_at >= func.datetime('now', '-7 days')
    ).count()
    
    stats = {
        "conversations": {
            "total": total_conversations,
            "active": active_conversations,
            "unread": unread_conversations,
            "recent_week": recent_conversations
        },
        "messages": {
            "total": total_messages,
            "inbound": inbound_messages,
            "outbound": outbound_messages,
            "ratio": round(outbound_messages / max(1, inbound_messages), 2)
        },
        "user_context": {
            "role": current_user.role,
            "user_id": current_user.id
        }
    }
    
    return stats