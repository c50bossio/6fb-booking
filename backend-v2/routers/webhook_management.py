"""
Webhook management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from db import get_db
from dependencies import get_current_admin_user
from models import User
from models import WebhookEndpoint, WebhookLog, WebhookEventType, WebhookAuthType, WebhookStatus
from services.webhook_service import webhook_service
from schemas import WebhookEndpointCreate, WebhookEndpointUpdate, WebhookEndpointResponse, WebhookLogResponse, WebhookTestRequest, WebhookListParams

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/webhooks",
    tags=["webhooks"],
    dependencies=[Depends(get_current_admin_user)]
)


@router.get("", response_model=List[WebhookEndpointResponse])
async def list_webhooks(
    is_active: Optional[bool] = None,
    event_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List all webhook endpoints with optional filtering"""
    query = db.query(WebhookEndpoint)
    
    if is_active is not None:
        query = query.filter(WebhookEndpoint.is_active == is_active)
    
    if event_type:
        query = query.filter(WebhookEndpoint.events.contains([event_type]))
    
    total = query.count()
    webhooks = query.offset(skip).limit(limit).all()
    
    return [webhook.to_dict() for webhook in webhooks]


@router.post("", response_model=WebhookEndpointResponse)
async def create_webhook(
    webhook_data: WebhookEndpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new webhook endpoint"""
    try:
        # Check if URL already exists
        existing = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.url == webhook_data.url
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A webhook with this URL already exists"
            )
        
        endpoint = webhook_service.create_endpoint(
            db=db,
            url=webhook_data.url,
            name=webhook_data.name,
            description=webhook_data.description,
            events=webhook_data.events,
            auth_type=webhook_data.auth_type,
            auth_config=webhook_data.auth_config,
            headers=webhook_data.headers,
            max_retries=webhook_data.max_retries,
            retry_delay_seconds=webhook_data.retry_delay_seconds,
            timeout_seconds=webhook_data.timeout_seconds,
            created_by=current_user.id
        )
        
        return endpoint.to_dict()
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create webhook"
        )


@router.get("/events", response_model=List[dict])
async def get_available_events(
    current_user: User = Depends(get_current_admin_user)
):
    """Get list of available webhook events"""
    events = []
    for event in WebhookEventType:
        category = event.value.split('.')[0]
        events.append({
            "value": event.value,
            "name": event.name,
            "category": category,
            "description": get_event_description(event)
        })
    
    return events


@router.get("/{webhook_id}", response_model=WebhookEndpointResponse)
async def get_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get webhook endpoint details"""
    webhook = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    return webhook.to_dict()


@router.put("/{webhook_id}", response_model=WebhookEndpointResponse)
async def update_webhook(
    webhook_id: str,
    webhook_data: WebhookEndpointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update webhook endpoint configuration"""
    webhook = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    try:
        # Prepare update data
        update_data = webhook_data.dict(exclude_unset=True)
        
        # Update the webhook
        updated_webhook = webhook_service.update_endpoint(
            db=db,
            endpoint=webhook,
            **update_data
        )
        
        return updated_webhook.to_dict()
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update webhook"
        )


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a webhook endpoint"""
    webhook = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    db.delete(webhook)
    db.commit()
    
    return {"message": "Webhook deleted successfully"}


@router.get("/{webhook_id}/logs", response_model=List[WebhookLogResponse])
async def get_webhook_logs(
    webhook_id: str,
    status: Optional[WebhookStatus] = None,
    event_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get webhook delivery logs"""
    query = db.query(WebhookLog).filter(
        WebhookLog.endpoint_id == webhook_id
    )
    
    if status:
        query = query.filter(WebhookLog.status == status)
    
    if event_type:
        query = query.filter(WebhookLog.event_type == event_type)
    
    if start_date:
        query = query.filter(WebhookLog.created_at >= start_date)
    
    if end_date:
        query = query.filter(WebhookLog.created_at <= end_date)
    
    # Order by most recent first
    query = query.order_by(WebhookLog.created_at.desc())
    
    total = query.count()
    logs = query.offset(skip).limit(limit).all()
    
    return [log.to_dict() for log in logs]


@router.post("/{webhook_id}/test", response_model=WebhookLogResponse)
async def test_webhook(
    webhook_id: str,
    test_request: WebhookTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Send a test webhook with sample data"""
    webhook = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.id == webhook_id
    ).first()
    
    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    if not webhook.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot test inactive webhook"
        )
    
    try:
        # Use webhook service context manager
        async with webhook_service as service:
            log = await service.test_webhook(
                db=db,
                endpoint=webhook,
                event_type=test_request.event_type
            )
        
        return log.to_dict()
    
    except Exception as e:
        logger.error(f"Error testing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test webhook"
        )


@router.post("/{webhook_id}/logs/{log_id}/retry", response_model=WebhookLogResponse)
async def retry_webhook_delivery(
    webhook_id: str,
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Retry a failed webhook delivery"""
    log = db.query(WebhookLog).filter(
        WebhookLog.id == log_id,
        WebhookLog.endpoint_id == webhook_id
    ).first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook log not found"
        )
    
    if log.status not in [WebhookStatus.FAILED, WebhookStatus.RETRYING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only retry failed webhooks"
        )
    
    try:
        async with webhook_service as service:
            await service.retry_webhook(db, log)
        
        db.refresh(log)
        return log.to_dict()
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error retrying webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retry webhook"
        )


@router.get("/stats/summary")
async def get_webhook_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get webhook statistics summary"""
    # Get total endpoints
    total_endpoints = db.query(WebhookEndpoint).count()
    active_endpoints = db.query(WebhookEndpoint).filter(
        WebhookEndpoint.is_active == True
    ).count()
    
    # Get delivery statistics for last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    
    total_deliveries = db.query(WebhookLog).filter(
        WebhookLog.created_at >= last_24h
    ).count()
    
    successful_deliveries = db.query(WebhookLog).filter(
        WebhookLog.created_at >= last_24h,
        WebhookLog.status == WebhookStatus.SUCCESS
    ).count()
    
    failed_deliveries = db.query(WebhookLog).filter(
        WebhookLog.created_at >= last_24h,
        WebhookLog.status == WebhookStatus.FAILED
    ).count()
    
    # Get recent failures
    recent_failures = db.query(WebhookLog).filter(
        WebhookLog.status == WebhookStatus.FAILED,
        WebhookLog.created_at >= last_24h
    ).order_by(WebhookLog.created_at.desc()).limit(5).all()
    
    # Calculate success rate
    success_rate = 0
    if total_deliveries > 0:
        success_rate = round((successful_deliveries / total_deliveries) * 100, 2)
    
    return {
        "total_endpoints": total_endpoints,
        "active_endpoints": active_endpoints,
        "last_24h": {
            "total_deliveries": total_deliveries,
            "successful_deliveries": successful_deliveries,
            "failed_deliveries": failed_deliveries,
            "success_rate": success_rate
        },
        "recent_failures": [
            {
                "id": log.id,
                "endpoint_id": log.endpoint_id,
                "event_type": log.event_type,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat()
            }
            for log in recent_failures
        ]
    }


def get_event_description(event: WebhookEventType) -> str:
    """Get human-readable description for webhook events"""
    descriptions = {
        WebhookEventType.BOOKING_CREATED: "Triggered when a new booking is created",
        WebhookEventType.BOOKING_UPDATED: "Triggered when a booking is updated",
        WebhookEventType.BOOKING_CANCELLED: "Triggered when a booking is cancelled",
        WebhookEventType.BOOKING_CONFIRMED: "Triggered when a booking is confirmed",
        WebhookEventType.BOOKING_COMPLETED: "Triggered when a booking is marked as completed",
        WebhookEventType.PAYMENT_COMPLETED: "Triggered when a payment is successfully processed",
        WebhookEventType.PAYMENT_FAILED: "Triggered when a payment fails",
        WebhookEventType.PAYMENT_REFUNDED: "Triggered when a payment is refunded",
        WebhookEventType.USER_CREATED: "Triggered when a new user account is created",
        WebhookEventType.USER_UPDATED: "Triggered when user profile is updated",
        WebhookEventType.USER_DEACTIVATED: "Triggered when a user account is deactivated",
        WebhookEventType.CLIENT_CREATED: "Triggered when a new client is added",
        WebhookEventType.CLIENT_UPDATED: "Triggered when client information is updated",
        WebhookEventType.SERVICE_CREATED: "Triggered when a new service is created",
        WebhookEventType.SERVICE_UPDATED: "Triggered when service details are updated",
        WebhookEventType.SERVICE_DELETED: "Triggered when a service is deleted",
        WebhookEventType.NOTIFICATION_SENT: "Triggered when a notification is sent",
        WebhookEventType.NOTIFICATION_FAILED: "Triggered when a notification fails to send",
        WebhookEventType.AVAILABILITY_UPDATED: "Triggered when barber availability is updated",
        WebhookEventType.AVAILABILITY_BLOCKED: "Triggered when time slots are blocked",
    }
    
    return descriptions.get(event, "No description available")