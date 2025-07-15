"""
Event Streaming API endpoints for BookedBarber V2.

Provides REST API for event publishing, stream monitoring, and consumer management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from dependencies import get_current_user
from models import User
from services.event_streaming_service import (
    event_streaming_service, StreamName, StreamEvent, 
    MarketingEvent, UserBehaviorEvent
)
from utils.error_handling import safe_endpoint
from utils.rate_limiter import RateLimiter

router = APIRouter(
    prefix="/api/v1/events",
    tags=["event-streaming"],
    responses={404: {"description": "Not found"}}
)

# Rate limiter for event publishing
rate_limiter = RateLimiter(requests_per_minute=1000)


class EventPublishRequest(BaseModel):
    """Request model for publishing events"""
    event_type: str
    user_id: Optional[int] = None
    organization_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None


class MarketingEventRequest(EventPublishRequest):
    """Request model for marketing events"""
    campaign_id: Optional[str] = None
    channel: Optional[str] = None
    conversion_value: Optional[float] = None


class UserBehaviorRequest(EventPublishRequest):
    """Request model for user behavior events"""
    page_url: Optional[str] = None
    action: Optional[str] = None
    session_id: Optional[str] = None


class NotificationEventRequest(EventPublishRequest):
    """Request model for notification events"""
    notification_type: str
    message: str


class EventResponse(BaseModel):
    """Response model for event operations"""
    success: bool
    event_id: Optional[str] = None
    message: str
    timestamp: datetime


class StreamInfoResponse(BaseModel):
    """Response model for stream information"""
    stream_name: str
    length: int
    groups: int
    last_generated_id: Optional[str] = None
    pending_messages: int


class ConsumerStatusResponse(BaseModel):
    """Response model for consumer status"""
    consumer_name: str
    stream_name: str
    is_running: bool
    processed_count: Optional[int] = None
    pending_count: Optional[int] = None


@router.post("/marketing", response_model=EventResponse)
@safe_endpoint
async def publish_marketing_event(
    event_request: MarketingEventRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publish a marketing event to the event stream.
    
    Used for tracking marketing campaigns, conversions, and channel performance.
    """
    try:
        # Rate limiting check
        await rate_limiter.check_rate_limit(
            request=request,
            key=str(current_user.id)
        )
        
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        # Publish event
        event_id = await event_streaming_service.publish_marketing_event(
            event_type=event_request.event_type,
            user_id=event_request.user_id or current_user.id,
            organization_id=event_request.organization_id,
            campaign_id=event_request.campaign_id,
            channel=event_request.channel,
            conversion_value=event_request.conversion_value,
            data=event_request.data
        )
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message="Marketing event published successfully",
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish marketing event: {str(e)}")


@router.post("/behavior", response_model=EventResponse)
@safe_endpoint
async def publish_user_behavior(
    event_request: UserBehaviorRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publish a user behavior event to the event stream.
    
    Used for tracking user interactions, page views, and feature usage.
    """
    try:
        # Rate limiting check
        await rate_limiter.check_rate_limit(
            request=request,
            key=str(current_user.id)
        )
        
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        # Publish event
        event_id = await event_streaming_service.publish_user_behavior(
            event_type=event_request.event_type,
            user_id=event_request.user_id or current_user.id,
            organization_id=event_request.organization_id,
            page_url=event_request.page_url,
            action=event_request.action,
            session_id=event_request.session_id,
            data=event_request.data
        )
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message="User behavior event published successfully",
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish behavior event: {str(e)}")


@router.post("/conversions", response_model=EventResponse)
@safe_endpoint
async def publish_conversion_event(
    event_type: str,
    conversion_value: float,
    request: Request,
    campaign_id: Optional[str] = None,
    channel: Optional[str] = None,
    organization_id: Optional[int] = None,
    data: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publish a conversion event to the event stream.
    
    Used for tracking successful conversions and revenue attribution.
    """
    try:
        # Rate limiting check
        await rate_limiter.check_rate_limit(
            request=request,
            key=str(current_user.id)
        )
        
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        # Publish event
        event_id = await event_streaming_service.publish_conversion_event(
            event_type=event_type,
            user_id=current_user.id,
            organization_id=organization_id,
            conversion_value=conversion_value,
            campaign_id=campaign_id,
            channel=channel,
            data=data
        )
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message="Conversion event published successfully",
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish conversion event: {str(e)}")


@router.post("/notifications", response_model=EventResponse)
@safe_endpoint
async def publish_notification_event(
    event_request: NotificationEventRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Publish a notification event to the event stream.
    
    Used for real-time notifications and system alerts.
    """
    try:
        # Rate limiting check
        await rate_limiter.check_rate_limit(
            request=request,
            key=str(current_user.id)
        )
        
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        # Publish event
        event_id = await event_streaming_service.publish_notification_event(
            event_type=event_request.event_type,
            user_id=event_request.user_id or current_user.id,
            notification_type=event_request.notification_type,
            message=event_request.message,
            data=event_request.data
        )
        
        return EventResponse(
            success=True,
            event_id=event_id,
            message="Notification event published successfully",
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish notification event: {str(e)}")


@router.get("/streams", response_model=List[StreamInfoResponse])
@safe_endpoint
async def get_streams_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about all event streams.
    
    Returns stream statistics including length, consumer groups, and pending messages.
    """
    try:
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        streams_info = []
        
        for stream in StreamName:
            try:
                info = await event_streaming_service.get_stream_info(stream)
                pending = await event_streaming_service.get_pending_messages(stream, "processors")
                
                streams_info.append(StreamInfoResponse(
                    stream_name=stream.value,
                    length=info.get("length", 0),
                    groups=info.get("groups", 0),
                    last_generated_id=info.get("last-generated-id", "").decode() if info.get("last-generated-id") else None,
                    pending_messages=len(pending) if pending else 0
                ))
            except Exception as e:
                # Stream might not exist yet
                streams_info.append(StreamInfoResponse(
                    stream_name=stream.value,
                    length=0,
                    groups=0,
                    pending_messages=0
                ))
        
        return streams_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get streams info: {str(e)}")


@router.get("/streams/{stream_name}", response_model=StreamInfoResponse)
@safe_endpoint
async def get_stream_info(
    stream_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific event stream.
    """
    try:
        # Validate stream name
        stream = None
        for s in StreamName:
            if s.value == stream_name:
                stream = s
                break
        
        if not stream:
            raise HTTPException(status_code=404, detail=f"Stream '{stream_name}' not found")
        
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        info = await event_streaming_service.get_stream_info(stream)
        pending = await event_streaming_service.get_pending_messages(stream, "processors")
        
        return StreamInfoResponse(
            stream_name=stream.value,
            length=info.get("length", 0),
            groups=info.get("groups", 0),
            last_generated_id=info.get("last-generated-id", "").decode() if info.get("last-generated-id") else None,
            pending_messages=len(pending) if pending else 0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stream info: {str(e)}")


@router.post("/streams/{stream_name}/trim")
@safe_endpoint
async def trim_stream(
    stream_name: str,
    max_length: int = Query(10000, ge=100, le=1000000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trim a stream to a maximum length to manage memory usage.
    
    Only administrators can perform this operation.
    """
    try:
        # Check if user is admin (you may want to implement proper role checking)
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        # Validate stream name
        stream = None
        for s in StreamName:
            if s.value == stream_name:
                stream = s
                break
        
        if not stream:
            raise HTTPException(status_code=404, detail=f"Stream '{stream_name}' not found")
        
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        trimmed_count = await event_streaming_service.trim_stream(stream, max_length)
        
        return {
            "success": True,
            "stream_name": stream_name,
            "trimmed_messages": trimmed_count,
            "max_length": max_length,
            "message": f"Stream trimmed successfully. Removed {trimmed_count} messages."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trim stream: {str(e)}")


@router.get("/consumers/status", response_model=List[ConsumerStatusResponse])
@safe_endpoint
async def get_consumers_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get status of all event stream consumers.
    
    Shows which consumers are running and their processing statistics.
    """
    try:
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        consumers_status = []
        
        for group_name, consumer_group in event_streaming_service.consumer_groups.items():
            is_running = event_streaming_service.running_consumers.get(group_name, False)
            
            # Get pending messages for this consumer
            try:
                pending = await event_streaming_service.get_pending_messages(
                    consumer_group.stream, 
                    group_name
                )
                pending_count = len(pending) if pending else 0
            except:
                pending_count = 0
            
            consumers_status.append(ConsumerStatusResponse(
                consumer_name=group_name,
                stream_name=consumer_group.stream.value,
                is_running=is_running,
                pending_count=pending_count
            ))
        
        return consumers_status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get consumers status: {str(e)}")


@router.post("/consumers/{consumer_name}/start")
@safe_endpoint
async def start_consumer(
    consumer_name: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a specific event stream consumer.
    
    Only administrators can perform this operation.
    """
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        if consumer_name not in event_streaming_service.consumer_groups:
            raise HTTPException(status_code=404, detail=f"Consumer '{consumer_name}' not found")
        
        if event_streaming_service.running_consumers.get(consumer_name, False):
            return {
                "success": False,
                "message": f"Consumer '{consumer_name}' is already running"
            }
        
        # Start consumer in background
        background_tasks.add_task(
            event_streaming_service.start_consumer,
            consumer_name
        )
        
        return {
            "success": True,
            "consumer_name": consumer_name,
            "message": f"Consumer '{consumer_name}' started successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start consumer: {str(e)}")


@router.post("/consumers/{consumer_name}/stop")
@safe_endpoint
async def stop_consumer(
    consumer_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stop a specific event stream consumer.
    
    Only administrators can perform this operation.
    """
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        if consumer_name not in event_streaming_service.consumer_groups:
            raise HTTPException(status_code=404, detail=f"Consumer '{consumer_name}' not found")
        
        if not event_streaming_service.running_consumers.get(consumer_name, False):
            return {
                "success": False,
                "message": f"Consumer '{consumer_name}' is not running"
            }
        
        await event_streaming_service.stop_consumer(consumer_name)
        
        return {
            "success": True,
            "consumer_name": consumer_name,
            "message": f"Consumer '{consumer_name}' stopped successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop consumer: {str(e)}")


@router.get("/health")
@safe_endpoint
async def event_streaming_health():
    """
    Check health of the event streaming system.
    """
    try:
        # Initialize service if needed
        if not event_streaming_service.redis_client:
            await event_streaming_service.initialize()
        
        # Test Redis connection
        await event_streaming_service.redis_client.ping()
        
        # Get streams info
        streams_count = len(StreamName)
        consumers_count = len(event_streaming_service.consumer_groups)
        running_consumers = sum(1 for running in event_streaming_service.running_consumers.values() if running)
        
        return {
            "status": "healthy",
            "redis_connection": "active",
            "streams_configured": streams_count,
            "consumers_registered": consumers_count,
            "consumers_running": running_consumers,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow()
        }