"""
Real-time Updates Service for 6FB Booking System
WebSocket connections, event streaming, and state synchronization
"""
import asyncio
import json
import logging
import time
from typing import Dict, List, Set, Any, Optional, Callable
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
from collections import defaultdict
import uuid
import redis.asyncio as redis
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class EventType(Enum):
    """Event types for real-time updates"""
    # Appointment events
    APPOINTMENT_CREATED = "appointment.created"
    APPOINTMENT_UPDATED = "appointment.updated"
    APPOINTMENT_CANCELLED = "appointment.cancelled"
    APPOINTMENT_COMPLETED = "appointment.completed"
    
    # Booking events
    BOOKING_REQUEST = "booking.request"
    BOOKING_CONFIRMED = "booking.confirmed"
    BOOKING_CANCELLED = "booking.cancelled"
    
    # User events
    USER_ONLINE = "user.online"
    USER_OFFLINE = "user.offline"
    USER_TYPING = "user.typing"
    
    # Barber events
    BARBER_AVAILABLE = "barber.available"
    BARBER_BUSY = "barber.busy"
    BARBER_OFFLINE = "barber.offline"
    
    # Payment events
    PAYMENT_PROCESSING = "payment.processing"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_FAILED = "payment.failed"
    
    # Analytics events
    METRICS_UPDATED = "metrics.updated"
    REVENUE_UPDATED = "revenue.updated"
    
    # System events
    SYSTEM_MAINTENANCE = "system.maintenance"
    SYSTEM_ALERT = "system.alert"
    
    # Custom events
    CUSTOM = "custom"


@dataclass
class RealtimeEvent:
    """Real-time event data structure"""
    event_type: EventType
    data: Dict[str, Any]
    user_id: Optional[str] = None
    barber_id: Optional[str] = None
    location_id: Optional[str] = None
    timestamp: float = None
    event_id: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()
        if self.event_id is None:
            self.event_id = str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization"""
        return {
            'event_type': self.event_type.value,
            'data': self.data,
            'user_id': self.user_id,
            'barber_id': self.barber_id,
            'location_id': self.location_id,
            'timestamp': self.timestamp,
            'event_id': self.event_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RealtimeEvent':
        """Create event from dictionary"""
        return cls(
            event_type=EventType(data['event_type']),
            data=data['data'],
            user_id=data.get('user_id'),
            barber_id=data.get('barber_id'),
            location_id=data.get('location_id'),
            timestamp=data.get('timestamp'),
            event_id=data.get('event_id')
        )


class ConnectionManager:
    """WebSocket connection manager with advanced features"""
    
    def __init__(self, redis_client=None):
        self.connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = defaultdict(set)
        self.barber_connections: Dict[str, Set[str]] = defaultdict(set)
        self.location_connections: Dict[str, Set[str]] = defaultdict(set)
        self.room_connections: Dict[str, Set[str]] = defaultdict(set)
        
        # Connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Redis for multi-instance support
        self.redis_client = redis_client
        self.redis_channel = "6fb_realtime_events"
        
        # Event handlers
        self.event_handlers: Dict[EventType, List[Callable]] = defaultdict(list)
        
        # Statistics
        self.stats = {
            'total_connections': 0,
            'active_connections': 0,
            'messages_sent': 0,
            'messages_received': 0,
            'connection_errors': 0
        }
        
        # Start Redis listener if available
        if self.redis_client:
            asyncio.create_task(self._redis_listener())
    
    async def connect(
        self, 
        websocket: WebSocket, 
        user_id: str = None, 
        barber_id: str = None,
        location_id: str = None,
        connection_type: str = "client"
    ) -> str:
        """Accept WebSocket connection and register client"""
        await websocket.accept()
        
        # Generate connection ID
        connection_id = str(uuid.uuid4())
        
        # Store connection
        self.connections[connection_id] = websocket
        
        # Store metadata
        self.connection_metadata[connection_id] = {
            'user_id': user_id,
            'barber_id': barber_id,
            'location_id': location_id,
            'connection_type': connection_type,
            'connected_at': time.time(),
            'last_activity': time.time()
        }
        
        # Add to appropriate groups
        if user_id:
            self.user_connections[user_id].add(connection_id)
        if barber_id:
            self.barber_connections[barber_id].add(connection_id)
        if location_id:
            self.location_connections[location_id].add(connection_id)
        
        # Update statistics
        self.stats['total_connections'] += 1
        self.stats['active_connections'] += 1
        
        logger.info(f"WebSocket connected: {connection_id} (user: {user_id}, barber: {barber_id})")
        
        # Send connection confirmation
        await self.send_to_connection(connection_id, RealtimeEvent(
            event_type=EventType.CUSTOM,
            data={
                'type': 'connection_established',
                'connection_id': connection_id,
                'timestamp': time.time()
            }
        ))
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Disconnect WebSocket and clean up"""
        if connection_id not in self.connections:
            return
        
        # Get metadata
        metadata = self.connection_metadata.get(connection_id, {})
        
        # Remove from groups
        user_id = metadata.get('user_id')
        barber_id = metadata.get('barber_id')
        location_id = metadata.get('location_id')
        
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        if barber_id and barber_id in self.barber_connections:
            self.barber_connections[barber_id].discard(connection_id)
            if not self.barber_connections[barber_id]:
                del self.barber_connections[barber_id]
        
        if location_id and location_id in self.location_connections:
            self.location_connections[location_id].discard(connection_id)
            if not self.location_connections[location_id]:
                del self.location_connections[location_id]
        
        # Remove from rooms
        for room_connections in self.room_connections.values():
            room_connections.discard(connection_id)
        
        # Clean up
        del self.connections[connection_id]
        del self.connection_metadata[connection_id]
        
        # Update statistics
        self.stats['active_connections'] -= 1
        
        logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def send_to_connection(self, connection_id: str, event: RealtimeEvent):
        """Send event to specific connection"""
        if connection_id not in self.connections:
            return False
        
        try:
            websocket = self.connections[connection_id]
            message = json.dumps(event.to_dict())
            await websocket.send_text(message)
            
            # Update activity timestamp
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]['last_activity'] = time.time()
            
            self.stats['messages_sent'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Error sending to connection {connection_id}: {str(e)}")
            self.stats['connection_errors'] += 1
            await self.disconnect(connection_id)
            return False
    
    async def send_to_user(self, user_id: str, event: RealtimeEvent):
        """Send event to all connections for a user"""
        if user_id not in self.user_connections:
            return 0
        
        connections = list(self.user_connections[user_id])
        sent_count = 0
        
        for connection_id in connections:
            if await self.send_to_connection(connection_id, event):
                sent_count += 1
        
        return sent_count
    
    async def send_to_barber(self, barber_id: str, event: RealtimeEvent):
        """Send event to all connections for a barber"""
        if barber_id not in self.barber_connections:
            return 0
        
        connections = list(self.barber_connections[barber_id])
        sent_count = 0
        
        for connection_id in connections:
            if await self.send_to_connection(connection_id, event):
                sent_count += 1
        
        return sent_count
    
    async def send_to_location(self, location_id: str, event: RealtimeEvent):
        """Send event to all connections for a location"""
        if location_id not in self.location_connections:
            return 0
        
        connections = list(self.location_connections[location_id])
        sent_count = 0
        
        for connection_id in connections:
            if await self.send_to_connection(connection_id, event):
                sent_count += 1
        
        return sent_count
    
    async def broadcast(self, event: RealtimeEvent, exclude_connections: Set[str] = None):
        """Broadcast event to all connections"""
        exclude_connections = exclude_connections or set()
        sent_count = 0
        
        for connection_id in list(self.connections.keys()):
            if connection_id not in exclude_connections:
                if await self.send_to_connection(connection_id, event):
                    sent_count += 1
        
        return sent_count
    
    async def join_room(self, connection_id: str, room: str):
        """Add connection to a room"""
        if connection_id in self.connections:
            self.room_connections[room].add(connection_id)
            logger.debug(f"Connection {connection_id} joined room {room}")
    
    async def leave_room(self, connection_id: str, room: str):
        """Remove connection from a room"""
        if room in self.room_connections:
            self.room_connections[room].discard(connection_id)
            if not self.room_connections[room]:
                del self.room_connections[room]
            logger.debug(f"Connection {connection_id} left room {room}")
    
    async def send_to_room(self, room: str, event: RealtimeEvent):
        """Send event to all connections in a room"""
        if room not in self.room_connections:
            return 0
        
        connections = list(self.room_connections[room])
        sent_count = 0
        
        for connection_id in connections:
            if await self.send_to_connection(connection_id, event):
                sent_count += 1
        
        return sent_count
    
    async def _redis_listener(self):
        """Listen for events from Redis (for multi-instance support)"""
        try:
            pubsub = self.redis_client.pubsub()
            await pubsub.subscribe(self.redis_channel)
            
            async for message in pubsub.listen():
                if message['type'] == 'message':
                    try:
                        event_data = json.loads(message['data'])
                        event = RealtimeEvent.from_dict(event_data)
                        await self._handle_redis_event(event)
                    except Exception as e:
                        logger.error(f"Error processing Redis event: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Redis listener error: {str(e)}")
    
    async def _handle_redis_event(self, event: RealtimeEvent):
        """Handle event received from Redis"""
        # Determine recipients based on event data
        if event.user_id:
            await self.send_to_user(event.user_id, event)
        elif event.barber_id:
            await self.send_to_barber(event.barber_id, event)
        elif event.location_id:
            await self.send_to_location(event.location_id, event)
        else:
            await self.broadcast(event)
    
    def add_event_handler(self, event_type: EventType, handler: Callable):
        """Add event handler for specific event type"""
        self.event_handlers[event_type].append(handler)
    
    async def handle_event(self, event: RealtimeEvent):
        """Handle incoming event and trigger handlers"""
        self.stats['messages_received'] += 1
        
        # Trigger event handlers
        handlers = self.event_handlers.get(event.event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"Event handler error: {str(e)}")
        
        # Publish to Redis for multi-instance support
        if self.redis_client:
            try:
                await self.redis_client.publish(
                    self.redis_channel, 
                    json.dumps(event.to_dict())
                )
            except Exception as e:
                logger.error(f"Redis publish error: {str(e)}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            **self.stats,
            'active_users': len(self.user_connections),
            'active_barbers': len(self.barber_connections),
            'active_locations': len(self.location_connections),
            'active_rooms': len(self.room_connections),
            'avg_connections_per_user': (
                len(self.connections) / max(1, len(self.user_connections))
            ),
            'timestamp': time.time()
        }
    
    async def cleanup_stale_connections(self, timeout: int = 300):
        """Clean up stale connections (no activity for timeout seconds)"""
        current_time = time.time()
        stale_connections = []
        
        for connection_id, metadata in self.connection_metadata.items():
            last_activity = metadata.get('last_activity', current_time)
            if current_time - last_activity > timeout:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            await self.disconnect(connection_id)
            logger.info(f"Cleaned up stale connection: {connection_id}")
        
        return len(stale_connections)


class RealtimeEventService:
    """Service for managing real-time events"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        
        # Register default event handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default event handlers"""
        # Appointment event handlers
        self.connection_manager.add_event_handler(
            EventType.APPOINTMENT_CREATED, 
            self._handle_appointment_created
        )
        self.connection_manager.add_event_handler(
            EventType.APPOINTMENT_UPDATED, 
            self._handle_appointment_updated
        )
        
        # User status handlers
        self.connection_manager.add_event_handler(
            EventType.USER_ONLINE, 
            self._handle_user_status_change
        )
        self.connection_manager.add_event_handler(
            EventType.USER_OFFLINE, 
            self._handle_user_status_change
        )
    
    async def _handle_appointment_created(self, event: RealtimeEvent):
        """Handle appointment creation event"""
        appointment_data = event.data
        
        # Notify barber
        if event.barber_id:
            await self.connection_manager.send_to_barber(
                event.barber_id,
                RealtimeEvent(
                    event_type=EventType.APPOINTMENT_CREATED,
                    data={
                        'message': 'New appointment created',
                        'appointment': appointment_data
                    },
                    barber_id=event.barber_id
                )
            )
        
        # Notify location staff
        if event.location_id:
            await self.connection_manager.send_to_location(
                event.location_id,
                RealtimeEvent(
                    event_type=EventType.APPOINTMENT_CREATED,
                    data={
                        'message': 'New appointment at location',
                        'appointment': appointment_data
                    },
                    location_id=event.location_id
                )
            )
    
    async def _handle_appointment_updated(self, event: RealtimeEvent):
        """Handle appointment update event"""
        appointment_data = event.data
        
        # Notify all relevant parties
        if event.user_id:
            await self.connection_manager.send_to_user(event.user_id, event)
        if event.barber_id:
            await self.connection_manager.send_to_barber(event.barber_id, event)
        if event.location_id:
            await self.connection_manager.send_to_location(event.location_id, event)
    
    async def _handle_user_status_change(self, event: RealtimeEvent):
        """Handle user status change event"""
        # Broadcast to location staff if user is a client
        if event.location_id:
            await self.connection_manager.send_to_location(event.location_id, event)
    
    # Event creation methods
    async def appointment_created(self, appointment_data: Dict[str, Any]):
        """Create appointment created event"""
        event = RealtimeEvent(
            event_type=EventType.APPOINTMENT_CREATED,
            data=appointment_data,
            user_id=appointment_data.get('client_id'),
            barber_id=appointment_data.get('barber_id'),
            location_id=appointment_data.get('location_id')
        )
        await self.connection_manager.handle_event(event)
    
    async def appointment_updated(self, appointment_data: Dict[str, Any]):
        """Create appointment updated event"""
        event = RealtimeEvent(
            event_type=EventType.APPOINTMENT_UPDATED,
            data=appointment_data,
            user_id=appointment_data.get('client_id'),
            barber_id=appointment_data.get('barber_id'),
            location_id=appointment_data.get('location_id')
        )
        await self.connection_manager.handle_event(event)
    
    async def payment_completed(self, payment_data: Dict[str, Any]):
        """Create payment completed event"""
        event = RealtimeEvent(
            event_type=EventType.PAYMENT_COMPLETED,
            data=payment_data,
            user_id=payment_data.get('user_id'),
            barber_id=payment_data.get('barber_id')
        )
        await self.connection_manager.handle_event(event)
    
    async def barber_status_changed(self, barber_id: str, status: str, location_id: str = None):
        """Create barber status change event"""
        event_type_map = {
            'available': EventType.BARBER_AVAILABLE,
            'busy': EventType.BARBER_BUSY,
            'offline': EventType.BARBER_OFFLINE
        }
        
        event = RealtimeEvent(
            event_type=event_type_map.get(status, EventType.BARBER_OFFLINE),
            data={'status': status, 'barber_id': barber_id},
            barber_id=barber_id,
            location_id=location_id
        )
        await self.connection_manager.handle_event(event)
    
    async def send_system_alert(self, message: str, alert_type: str = "info"):
        """Send system-wide alert"""
        event = RealtimeEvent(
            event_type=EventType.SYSTEM_ALERT,
            data={
                'message': message,
                'alert_type': alert_type,
                'timestamp': time.time()
            }
        )
        await self.connection_manager.broadcast(event)


# Global instances
connection_manager = ConnectionManager()
realtime_service = RealtimeEventService(connection_manager)

# Export main components
__all__ = [
    'EventType',
    'RealtimeEvent',
    'ConnectionManager',
    'RealtimeEventService',
    'connection_manager',
    'realtime_service'
]