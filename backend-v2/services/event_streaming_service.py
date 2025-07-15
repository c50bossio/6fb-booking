"""
Event Streaming Service with Redis Streams for BookedBarber V2.

Provides real-time event processing for:
- Marketing analytics events
- User behavior tracking
- System notifications
- Conversion events
- Campaign performance updates
"""

import logging
import json
import asyncio
from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import redis.asyncio as redis
from sqlalchemy.orm import Session

from config.redis_config import get_redis_connection
from models.tracking import ConversionEvent, EventType

logger = logging.getLogger(__name__)


class StreamName(Enum):
    """Available event streams"""
    MARKETING_EVENTS = "marketing:events"
    USER_BEHAVIOR = "user:behavior"
    CONVERSIONS = "conversions:stream"
    NOTIFICATIONS = "notifications:stream"
    ANALYTICS = "analytics:stream"
    SYSTEM_EVENTS = "system:events"


@dataclass
class StreamEvent:
    """Base event structure for Redis Streams"""
    event_type: str
    timestamp: datetime
    user_id: Optional[int] = None
    organization_id: Optional[int] = None
    data: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, str]:
        """Convert to Redis Stream format (all values must be strings)"""
        return {
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "user_id": str(self.user_id) if self.user_id else "",
            "organization_id": str(self.organization_id) if self.organization_id else "",
            "data": json.dumps(self.data or {})
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> 'StreamEvent':
        """Create from Redis Stream data"""
        return cls(
            event_type=data["event_type"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            user_id=int(data["user_id"]) if data["user_id"] else None,
            organization_id=int(data["organization_id"]) if data["organization_id"] else None,
            data=json.loads(data["data"]) if data["data"] else {}
        )


@dataclass
class MarketingEvent(StreamEvent):
    """Marketing-specific event"""
    campaign_id: Optional[str] = None
    channel: Optional[str] = None
    conversion_value: Optional[float] = None
    
    def to_dict(self) -> Dict[str, str]:
        base_dict = super().to_dict()
        base_dict.update({
            "campaign_id": self.campaign_id or "",
            "channel": self.channel or "",
            "conversion_value": str(self.conversion_value) if self.conversion_value else "0"
        })
        return base_dict


@dataclass
class UserBehaviorEvent(StreamEvent):
    """User behavior tracking event"""
    page_url: Optional[str] = None
    action: Optional[str] = None
    session_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, str]:
        base_dict = super().to_dict()
        base_dict.update({
            "page_url": self.page_url or "",
            "action": self.action or "",
            "session_id": self.session_id or ""
        })
        return base_dict


class EventConsumerGroup:
    """Consumer group for processing stream events"""
    
    def __init__(self, name: str, stream: StreamName, handler: Callable):
        self.name = name
        self.stream = stream
        self.handler = handler
        self.consumer_id = f"{name}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"


class EventStreamingService:
    """
    Redis Streams-based event streaming service.
    Provides real-time event publishing and consumption.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.consumer_groups: Dict[str, EventConsumerGroup] = {}
        self.running_consumers: Dict[str, bool] = {}
        
    async def initialize(self):
        """Initialize Redis connection and consumer groups"""
        try:
            self.redis_client = await get_redis_connection()
            await self._create_consumer_groups()
            logger.info("Event streaming service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize event streaming service: {e}")
            raise
    
    async def _create_consumer_groups(self):
        """Create consumer groups for all streams"""
        streams = [
            StreamName.MARKETING_EVENTS,
            StreamName.USER_BEHAVIOR,
            StreamName.CONVERSIONS,
            StreamName.NOTIFICATIONS,
            StreamName.ANALYTICS,
            StreamName.SYSTEM_EVENTS
        ]
        
        for stream in streams:
            try:
                # Try to create consumer group (ignore if exists)
                await self.redis_client.xgroup_create(
                    stream.value, 
                    f"{stream.value}:processors", 
                    id="0",
                    mkstream=True
                )
                logger.info(f"Created consumer group for {stream.value}")
            except redis.exceptions.ResponseError as e:
                if "BUSYGROUP" in str(e):
                    # Group already exists, continue
                    pass
                else:
                    logger.error(f"Error creating consumer group for {stream.value}: {e}")
    
    async def publish_event(self, stream: StreamName, event: StreamEvent, maxlen: int = 10000) -> str:
        """
        Publish an event to a Redis Stream
        
        Args:
            stream: Target stream
            event: Event to publish
            maxlen: Maximum stream length (for memory management)
            
        Returns:
            Event ID
        """
        if not self.redis_client:
            await self.initialize()
        
        try:
            event_id = await self.redis_client.xadd(
                stream.value,
                event.to_dict(),
                maxlen=maxlen,
                approximate=True
            )
            
            logger.debug(f"Published event {event.event_type} to {stream.value}: {event_id}")
            return event_id.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to publish event to {stream.value}: {e}")
            raise
    
    async def publish_marketing_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        campaign_id: Optional[str] = None,
        channel: Optional[str] = None,
        conversion_value: Optional[float] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Publish a marketing event"""
        event = MarketingEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            organization_id=organization_id,
            campaign_id=campaign_id,
            channel=channel,
            conversion_value=conversion_value,
            data=data or {}
        )
        
        return await self.publish_event(StreamName.MARKETING_EVENTS, event)
    
    async def publish_user_behavior(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        page_url: Optional[str] = None,
        action: Optional[str] = None,
        session_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Publish a user behavior event"""
        event = UserBehaviorEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            organization_id=organization_id,
            page_url=page_url,
            action=action,
            session_id=session_id,
            data=data or {}
        )
        
        return await self.publish_event(StreamName.USER_BEHAVIOR, event)
    
    async def publish_conversion_event(
        self,
        event_type: str,
        user_id: int,
        organization_id: int,
        conversion_value: float,
        campaign_id: Optional[str] = None,
        channel: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Publish a conversion event"""
        event = MarketingEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            organization_id=organization_id,
            campaign_id=campaign_id,
            channel=channel,
            conversion_value=conversion_value,
            data=data or {}
        )
        
        return await self.publish_event(StreamName.CONVERSIONS, event)
    
    async def publish_notification_event(
        self,
        event_type: str,
        user_id: int,
        notification_type: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Publish a notification event"""
        event = StreamEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            data={
                "notification_type": notification_type,
                "message": message,
                **(data or {})
            }
        )
        
        return await self.publish_event(StreamName.NOTIFICATIONS, event)
    
    async def register_consumer(
        self,
        group_name: str,
        stream: StreamName,
        handler: Callable[[StreamEvent], None]
    ):
        """Register a consumer for a stream"""
        consumer_group = EventConsumerGroup(group_name, stream, handler)
        self.consumer_groups[group_name] = consumer_group
        logger.info(f"Registered consumer group {group_name} for {stream.value}")
    
    async def start_consumer(self, group_name: str, batch_size: int = 10):
        """Start consuming events for a consumer group"""
        if group_name not in self.consumer_groups:
            raise ValueError(f"Consumer group {group_name} not registered")
        
        consumer_group = self.consumer_groups[group_name]
        self.running_consumers[group_name] = True
        
        logger.info(f"Starting consumer {group_name} for {consumer_group.stream.value}")
        
        try:
            while self.running_consumers.get(group_name, False):
                try:
                    # Read from stream
                    messages = await self.redis_client.xreadgroup(
                        groupname=f"{consumer_group.stream.value}:processors",
                        consumername=consumer_group.consumer_id,
                        streams={consumer_group.stream.value: ">"},
                        count=batch_size,
                        block=1000  # 1 second timeout
                    )
                    
                    for stream_name, stream_messages in messages:
                        for message_id, fields in stream_messages:
                            try:
                                # Convert Redis data to event
                                event = StreamEvent.from_dict(fields)
                                
                                # Process event
                                await consumer_group.handler(event)
                                
                                # Acknowledge processing
                                await self.redis_client.xack(
                                    consumer_group.stream.value,
                                    f"{consumer_group.stream.value}:processors",
                                    message_id
                                )
                                
                            except Exception as e:
                                logger.error(f"Error processing message {message_id}: {e}")
                                # Note: Message will remain unacknowledged for retry
                
                except redis.exceptions.ResponseError as e:
                    if "NOGROUP" in str(e):
                        # Recreate consumer group
                        await self._create_consumer_groups()
                    else:
                        logger.error(f"Redis error in consumer {group_name}: {e}")
                        await asyncio.sleep(5)
                
                except Exception as e:
                    logger.error(f"Unexpected error in consumer {group_name}: {e}")
                    await asyncio.sleep(5)
        
        finally:
            logger.info(f"Consumer {group_name} stopped")
    
    async def stop_consumer(self, group_name: str):
        """Stop a running consumer"""
        if group_name in self.running_consumers:
            self.running_consumers[group_name] = False
            logger.info(f"Stopping consumer {group_name}")
    
    async def stop_all_consumers(self):
        """Stop all running consumers"""
        for group_name in list(self.running_consumers.keys()):
            await self.stop_consumer(group_name)
    
    async def get_stream_info(self, stream: StreamName) -> Dict[str, Any]:
        """Get information about a stream"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            info = await self.redis_client.xinfo_stream(stream.value)
            return info
        except redis.exceptions.ResponseError:
            # Stream doesn't exist
            return {"length": 0, "groups": 0}
    
    async def get_pending_messages(self, stream: StreamName, group_name: str) -> List[Dict[str, Any]]:
        """Get pending (unacknowledged) messages for a consumer group"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            pending = await self.redis_client.xpending(
                stream.value,
                f"{stream.value}:processors"
            )
            return pending
        except redis.exceptions.ResponseError:
            return []
    
    async def trim_stream(self, stream: StreamName, max_len: int = 10000):
        """Trim a stream to maximum length"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            trimmed = await self.redis_client.xtrim(
                stream.value,
                maxlen=max_len,
                approximate=True
            )
            logger.info(f"Trimmed {trimmed} messages from {stream.value}")
            return trimmed
        except Exception as e:
            logger.error(f"Error trimming stream {stream.value}: {e}")
            return 0
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.stop_all_consumers()
        if self.redis_client:
            await self.redis_client.close()


# Global service instance
event_streaming_service = EventStreamingService()


# Note: Event handlers are implemented in event_processors.py
# to avoid circular imports and maintain clean separation of concerns


async def initialize_event_consumers():
    """Initialize all event consumers"""
    # Import handlers here to avoid circular imports
    from services.event_processors import (
        handle_marketing_event, handle_user_behavior_event, handle_notification_event
    )
    
    # Register consumer handlers
    await event_streaming_service.register_consumer(
        "marketing_processor", 
        StreamName.MARKETING_EVENTS, 
        handle_marketing_event
    )
    
    await event_streaming_service.register_consumer(
        "behavior_processor", 
        StreamName.USER_BEHAVIOR, 
        handle_user_behavior_event
    )
    
    await event_streaming_service.register_consumer(
        "notification_processor", 
        StreamName.NOTIFICATIONS, 
        handle_notification_event
    )
    
    logger.info("Event consumers initialized")


async def start_all_consumers():
    """Start all registered consumers"""
    consumers = [
        "marketing_processor",
        "behavior_processor", 
        "notification_processor"
    ]
    
    tasks = []
    for consumer in consumers:
        task = asyncio.create_task(
            event_streaming_service.start_consumer(consumer)
        )
        tasks.append(task)
    
    return tasks