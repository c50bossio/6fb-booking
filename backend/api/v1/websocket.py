"""
WebSocket endpoints for real-time notifications
Enhanced with advanced real-time service integration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import jwt
import json
import asyncio
from typing import Optional

from config.database import get_db
from config.settings import settings
from models.user import User
from models.barber import Barber
from services.realtime_service import connection_manager, realtime_service, RealtimeEvent, EventType
from utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


async def get_current_user_ws(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Authenticate WebSocket connection via query parameter"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        email = payload.get("sub")
        if not email:
            return None
        
        user = db.query(User).filter(User.email == email).first()
        return user
    except jwt.PyJWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Main WebSocket endpoint for real-time notifications"""
    
    # Authenticate user
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Get barber info if user is a barber
    barber = db.query(Barber).filter(Barber.user_id == user.id).first()
    barber_id = str(barber.id) if barber else None
    
    # Connect user with enhanced connection manager
    connection_id = await connection_manager.connect(
        websocket,
        user_id=str(user.id),
        barber_id=barber_id,
        location_id=str(user.primary_location_id) if user.primary_location_id else None,
        connection_type="authenticated"
    )
    
    try:
        # Send user online event
        await realtime_service.barber_status_changed(
            barber_id, "available", str(user.primary_location_id) if user.primary_location_id else None
        ) if barber else None
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(connection_id, message, user, barber)
                
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from connection {connection_id}")
            except Exception as e:
                logger.error(f"Error handling message from connection {connection_id}: {str(e)}")
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(connection_id)
        
        # Send user offline event
        await realtime_service.barber_status_changed(
            barber_id, "offline", str(user.primary_location_id) if user.primary_location_id else None
        ) if barber else None
        
        logger.info(f"User {user.id} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        await connection_manager.disconnect(connection_id)


async def handle_websocket_message(connection_id: str, message: dict, user: User, barber: Barber = None):
    """Handle incoming WebSocket messages"""
    message_type = message.get('type')
    
    if message_type == 'ping':
        # Respond with pong
        await connection_manager.send_to_connection(
            connection_id,
            RealtimeEvent(
                event_type=EventType.CUSTOM,
                data={'type': 'pong', 'timestamp': message.get('timestamp')}
            )
        )
    
    elif message_type == 'join_room':
        # Join a specific room
        room = message.get('room')
        if room:
            await connection_manager.join_room(connection_id, room)
    
    elif message_type == 'leave_room':
        # Leave a specific room
        room = message.get('room')
        if room:
            await connection_manager.leave_room(connection_id, room)
    
    elif message_type == 'barber_status':
        # Update barber status
        if barber:
            status = message.get('status', 'available')
            await realtime_service.barber_status_changed(
                str(barber.id), 
                status, 
                str(user.primary_location_id) if user.primary_location_id else None
            )
    
    elif message_type == 'typing':
        # Handle typing indicator
        room = message.get('room')
        if room:
            typing_event = RealtimeEvent(
                event_type=EventType.USER_TYPING,
                data={
                    'user_id': str(user.id),
                    'user_name': user.full_name,
                    'typing': message.get('typing', True)
                },
                user_id=str(user.id)
            )
            await connection_manager.send_to_room(room, typing_event)
    
    else:
        logger.warning(f"Unknown message type: {message_type}")


@router.websocket("/ws/public")
async def public_websocket_endpoint(websocket: WebSocket):
    """Public WebSocket endpoint for unauthenticated users"""
    
    # Connect without authentication
    connection_id = await connection_manager.connect(
        websocket,
        connection_type="public"
    )
    
    try:
        # Handle public messages (limited functionality)
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Only handle ping/pong for public connections
                if message.get('type') == 'ping':
                    await connection_manager.send_to_connection(
                        connection_id,
                        RealtimeEvent(
                            event_type=EventType.CUSTOM,
                            data={'type': 'pong', 'timestamp': message.get('timestamp')}
                        )
                    )
                
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from public connection {connection_id}")
            except Exception as e:
                logger.error(f"Error handling public message: {str(e)}")
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(connection_id)
        logger.info(f"Public connection {connection_id} disconnected")
    except Exception as e:
        logger.error(f"Public WebSocket error: {e}")
        await connection_manager.disconnect(connection_id)


@router.get("/ws/status")
async def websocket_status():
    """Get WebSocket connection statistics"""
    stats = connection_manager.get_stats()
    return {
        "status": "active",
        "realtime_service": "enabled",
        **stats
    }


@router.post("/ws/broadcast")
async def broadcast_message(
    message: dict,
    user: User = Depends(get_current_user_ws)
):
    """Broadcast message to all connected clients (admin only)"""
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    event = RealtimeEvent(
        event_type=EventType.SYSTEM_ALERT,
        data=message
    )
    
    sent_count = await connection_manager.broadcast(event)
    
    return {
        "message": "Broadcast sent",
        "recipients": sent_count,
        "timestamp": event.timestamp
    }


@router.post("/ws/send-to-location/{location_id}")
async def send_to_location(
    location_id: str,
    message: dict,
    user: User = Depends(get_current_user_ws)
):
    """Send message to all users at a specific location"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    event = RealtimeEvent(
        event_type=EventType.CUSTOM,
        data=message,
        location_id=location_id
    )
    
    sent_count = await connection_manager.send_to_location(location_id, event)
    
    return {
        "message": "Message sent to location",
        "location_id": location_id,
        "recipients": sent_count,
        "timestamp": event.timestamp
    }


@router.get("/ws/cleanup")
async def cleanup_connections():
    """Clean up stale connections (admin endpoint)"""
    cleaned_count = await connection_manager.cleanup_stale_connections()
    
    return {
        "message": "Cleanup completed",
        "cleaned_connections": cleaned_count,
        "active_connections": connection_manager.stats['active_connections']
    }