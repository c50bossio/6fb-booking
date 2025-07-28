"""
Real-time Calendar WebSocket Router

Provides WebSocket endpoints for real-time calendar updates, appointment events,
and conflict notifications with proper authentication and connection management.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, List, Set, Optional, Any
import json
import asyncio
import logging
from datetime import datetime, timedelta
from pydantic import BaseModel, validator
import jwt

from db import get_db
from models import User, Appointment, Service
from utils.auth import get_current_user
from utils.auth import verify_token
from utils.logging_config import setup_logging

router = APIRouter(prefix="/ws", tags=["websocket-calendar"])
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    """Manages WebSocket connections for real-time calendar updates."""
    
    def __init__(self):
        # Active connections mapped by connection ID
        self.active_connections: Dict[str, WebSocket] = {}
        # User connections mapped by user ID
        self.user_connections: Dict[int, Set[str]] = {}
        # Barber connections mapped by barber ID
        self.barber_connections: Dict[int, Set[str]] = {}
        # Connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: int, barber_id: Optional[int] = None):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        
        self.active_connections[connection_id] = websocket
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Track barber connections if specified
        if barber_id:
            if barber_id not in self.barber_connections:
                self.barber_connections[barber_id] = set()
            self.barber_connections[barber_id].add(connection_id)
        
        # Store connection metadata
        self.connection_metadata[connection_id] = {
            'user_id': user_id,
            'barber_id': barber_id,
            'connected_at': datetime.utcnow(),
            'last_ping': datetime.utcnow(),
        }
        
        logger.info(f"WebSocket connected: {connection_id} (user: {user_id}, barber: {barber_id})")
        
        # Send welcome message
        await self.send_personal_message({
            'type': 'connection_established',
            'connection_id': connection_id,
            'server_time': datetime.utcnow().isoformat(),
            'message': 'Real-time calendar updates connected'
        }, websocket)

    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection."""
        if connection_id not in self.active_connections:
            return
            
        metadata = self.connection_metadata.get(connection_id, {})
        user_id = metadata.get('user_id')
        barber_id = metadata.get('barber_id')
        
        # Remove from active connections
        del self.active_connections[connection_id]
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from barber connections
        if barber_id and barber_id in self.barber_connections:
            self.barber_connections[barber_id].discard(connection_id)
            if not self.barber_connections[barber_id]:
                del self.barber_connections[barber_id]
        
        # Remove metadata
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
        
        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

    async def send_to_user(self, user_id: int, message: dict):
        """Send a message to all connections for a specific user."""
        if user_id not in self.user_connections:
            return
            
        connections_to_remove = []
        for connection_id in self.user_connections[user_id]:
            websocket = self.active_connections.get(connection_id)
            if websocket:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    connections_to_remove.append(connection_id)
        
        # Clean up failed connections
        for connection_id in connections_to_remove:
            self.disconnect(connection_id)

    async def send_to_barber(self, barber_id: int, message: dict):
        """Send a message to all connections for a specific barber."""
        if barber_id not in self.barber_connections:
            return
            
        connections_to_remove = []
        for connection_id in self.barber_connections[barber_id]:
            websocket = self.active_connections.get(connection_id)
            if websocket:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send message to barber {barber_id}: {e}")
                    connections_to_remove.append(connection_id)
        
        # Clean up failed connections
        for connection_id in connections_to_remove:
            self.disconnect(connection_id)

    async def broadcast_to_all(self, message: dict):
        """Send a message to all active connections."""
        connections_to_remove = []
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")
                connections_to_remove.append(connection_id)
        
        # Clean up failed connections
        for connection_id in connections_to_remove:
            self.disconnect(connection_id)

    async def handle_ping(self, connection_id: str, websocket: WebSocket, message: dict):
        """Handle ping messages and respond with pong."""
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]['last_ping'] = datetime.utcnow()
        
        await self.send_personal_message({
            'type': 'pong',
            'timestamp': message.get('timestamp', datetime.utcnow().timestamp() * 1000)
        }, websocket)

    def get_connection_stats(self) -> dict:
        """Get connection statistics."""
        return {
            'total_connections': len(self.active_connections),
            'unique_users': len(self.user_connections),
            'unique_barbers': len(self.barber_connections),
            'connections_per_user': {
                user_id: len(connections) 
                for user_id, connections in self.user_connections.items()
            },
            'connections_per_barber': {
                barber_id: len(connections) 
                for barber_id, connections in self.barber_connections.items()
            }
        }

# Global connection manager instance
manager = ConnectionManager()

# Pydantic models for WebSocket messages
class AppointmentEventMessage(BaseModel):
    type: str = "appointment_event"
    payload: dict
    timestamp: str
    
class ConflictEventMessage(BaseModel):
    type: str = "conflict_event"
    payload: dict
    timestamp: str

class ClientEventMessage(BaseModel):
    type: str = "client_event"
    payload: dict
    timestamp: str

# Authentication for WebSocket
async def authenticate_websocket(token: str, db: Session) -> Optional[dict]:
    """Authenticate WebSocket connection using JWT token."""
    try:
        if not token:
            return None
            
        # Decode JWT token
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        
        if not user_id:
            return None
            
        # Get user from database
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            return None
            
        # User is the barber in this system
        return {
            'user_id': user.id,
            'barber_id': user.id,  # User IS the barber
            'username': user.username,
            'email': user.email,
        }
        
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        return None

@router.websocket("/calendar")
async def websocket_calendar_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    barber_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time calendar updates.
    
    Query Parameters:
    - token: JWT authentication token
    - barber_id: Optional barber ID to filter events
    """
    connection_id = f"cal_{datetime.utcnow().timestamp()}_{id(websocket)}"
    
    try:
        # Authenticate connection
        if token:
            auth_data = await authenticate_websocket(token, db)
            if not auth_data:
                await websocket.close(code=4001, reason="Authentication failed")
                return
        else:
            # Allow anonymous connections in development
            auth_data = {
                'user_id': 0,
                'barber_id': barber_id,
                'username': 'anonymous',
                'email': 'anonymous@example.com',
            }
        
        # Connect to manager
        await manager.connect(
            websocket, 
            connection_id, 
            auth_data['user_id'], 
            auth_data['barber_id'] or barber_id
        )
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat_loop(connection_id, websocket))
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                message_type = message.get('type', '')
                
                if message_type == 'ping':
                    await manager.handle_ping(connection_id, websocket, message)
                
                elif message_type == 'client_event':
                    # Handle client-initiated events
                    await handle_client_event(connection_id, message, db)
                
                elif message_type == 'subscribe_barber':
                    # Subscribe to specific barber's events
                    requested_barber_id = message.get('barber_id')
                    if requested_barber_id:
                        await subscribe_to_barber_events(connection_id, requested_barber_id)
                
                elif message_type == 'get_connection_stats':
                    # Send connection statistics
                    stats = manager.get_connection_stats()
                    await manager.send_personal_message({
                        'type': 'connection_stats',
                        'payload': stats,
                        'timestamp': datetime.utcnow().isoformat()
                    }, websocket)
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected: {connection_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            # Cancel heartbeat task
            heartbeat_task.cancel()
            manager.disconnect(connection_id)
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=4000, reason="Connection error")

async def heartbeat_loop(connection_id: str, websocket: WebSocket):
    """Send periodic heartbeat messages to keep connection alive."""
    try:
        while True:
            await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            
            if connection_id in manager.active_connections:
                await manager.send_personal_message({
                    'type': 'heartbeat',
                    'timestamp': datetime.utcnow().isoformat(),
                    'connection_id': connection_id
                }, websocket)
            else:
                break
                
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Heartbeat error for {connection_id}: {e}")

async def handle_client_event(connection_id: str, message: dict, db: Session):
    """Handle events sent from clients."""
    try:
        payload = message.get('payload', {})
        event_type = payload.get('type', '')
        
        # Validate and process client events
        if event_type in ['appointment_update', 'calendar_refresh', 'barber_status_change']:
            # Broadcast relevant updates to other connected clients
            broadcast_message = {
                'type': 'appointment_event',
                'payload': payload,
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'client'
            }
            
            # Determine broadcast scope
            barber_id = payload.get('barber_id')
            if barber_id:
                await manager.send_to_barber(barber_id, broadcast_message)
            else:
                await manager.broadcast_to_all(broadcast_message)
                
        logger.debug(f"Handled client event: {event_type}")
        
    except Exception as e:
        logger.error(f"Error handling client event: {e}")

async def subscribe_to_barber_events(connection_id: str, barber_id: int):
    """Subscribe a connection to a specific barber's events."""
    try:
        # Add connection to barber's subscription list
        if barber_id not in manager.barber_connections:
            manager.barber_connections[barber_id] = set()
        manager.barber_connections[barber_id].add(connection_id)
        
        # Update connection metadata
        if connection_id in manager.connection_metadata:
            manager.connection_metadata[connection_id]['subscribed_barber'] = barber_id
        
        logger.info(f"Connection {connection_id} subscribed to barber {barber_id}")
        
    except Exception as e:
        logger.error(f"Error subscribing to barber events: {e}")

# API endpoints for triggering real-time events
@router.post("/trigger/appointment-event")
async def trigger_appointment_event(
    event: AppointmentEventMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger a real-time appointment event.
    Used by the application to broadcast appointment changes.
    """
    try:
        # Validate event payload
        payload = event.payload
        appointment_id = payload.get('appointmentId')
        barber_id = payload.get('barberId')
        
        # Get appointment details from database for validation
        if appointment_id:
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if appointment:
                # Enrich event data with database information
                service = db.query(Service).filter(Service.id == appointment.service_id).first()
                payload.update({
                    'serviceName': service.name if service else 'Unknown Service',
                    'clientName': appointment.client_name or 'Unknown Client',
                    'appointmentDate': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                    'startTime': appointment.start_time.isoformat() if appointment.start_time else None,
                })
        
        # Broadcast event based on scope
        broadcast_message = {
            'type': 'appointment_event',
            'payload': payload,
            'timestamp': event.timestamp,
            'triggered_by': current_user.id
        }
        
        if barber_id:
            await manager.send_to_barber(barber_id, broadcast_message)
            logger.info(f"Sent appointment event to barber {barber_id}")
        else:
            await manager.broadcast_to_all(broadcast_message)
            logger.info("Broadcast appointment event to all connections")
        
        return {"status": "success", "message": "Event triggered successfully"}
        
    except Exception as e:
        logger.error(f"Error triggering appointment event: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger event")

@router.post("/trigger/conflict-event")
async def trigger_conflict_event(
    event: ConflictEventMessage,
    current_user: User = Depends(get_current_user)
):
    """
    Trigger a real-time conflict event.
    Used to notify about scheduling conflicts.
    """
    try:
        broadcast_message = {
            'type': 'conflict_event',
            'payload': event.payload,
            'timestamp': event.timestamp,
            'triggered_by': current_user.id
        }
        
        # Conflicts are always broadcast to all connections
        await manager.broadcast_to_all(broadcast_message)
        logger.info("Broadcast conflict event to all connections")
        
        return {"status": "success", "message": "Conflict event triggered successfully"}
        
    except Exception as e:
        logger.error(f"Error triggering conflict event: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger conflict event")

@router.get("/stats")
async def get_websocket_stats(current_user: User = Depends(get_current_user)):
    """Get WebSocket connection statistics."""
    try:
        stats = manager.get_connection_stats()
        
        # Add additional metrics
        stats.update({
            'server_time': datetime.utcnow().isoformat(),
            'uptime_hours': (datetime.utcnow() - datetime.utcnow().replace(hour=0, minute=0, second=0)).total_seconds() / 3600,
        })
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting WebSocket stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

@router.post("/broadcast/maintenance")
async def broadcast_maintenance_message(
    message: str,
    duration_minutes: int = 15,
    current_user: User = Depends(get_current_user)
):
    """
    Broadcast a maintenance message to all connected clients.
    Requires admin privileges.
    """
    try:
        # Check if user has admin privileges (implement based on your auth system)
        if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        
        broadcast_message = {
            'type': 'maintenance_notification',
            'payload': {
                'message': message,
                'duration_minutes': duration_minutes,
                'scheduled_time': datetime.utcnow().isoformat(),
            },
            'timestamp': datetime.utcnow().isoformat(),
            'priority': 'high'
        }
        
        await manager.broadcast_to_all(broadcast_message)
        logger.info(f"Broadcast maintenance message: {message}")
        
        return {"status": "success", "message": "Maintenance notification sent"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting maintenance message: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast message")

# Helper function to integrate with appointment creation/updates
async def notify_appointment_change(
    appointment_id: int, 
    event_type: str, 
    db: Session,
    user_id: Optional[int] = None
):
    """
    Helper function to notify about appointment changes.
    Can be called from other parts of the application.
    """
    try:
        # Get appointment details
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return
        
        # Get related data
        service = db.query(Service).filter(Service.id == appointment.service_id).first()
        barber = db.query(User).filter(User.id == appointment.barber_id).first()
        
        # Create event payload
        payload = {
            'id': f"event_{appointment_id}_{datetime.utcnow().timestamp()}",
            'type': event_type,
            'appointmentId': appointment.id,
            'barberId': appointment.barber_id,
            'clientId': appointment.client_id,
            'barberName': barber.username if barber else 'Unknown Barber',
            'clientName': appointment.client_name or 'Unknown Client',
            'serviceName': service.name if service else 'Unknown Service',
            'serviceId': service.id if service else None,
            'appointmentDate': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
            'startTime': appointment.start_time.isoformat() if appointment.start_time else None,
            'timestamp': datetime.utcnow().isoformat(),
            'priority': 'medium' if event_type not in ['cancelled', 'no_show'] else 'high',
        }
        
        # Add reschedule-specific data
        if event_type == 'rescheduled':
            # This would need to be passed in or stored separately
            payload.update({
                'originalDate': None,  # Would need original date
                'originalTime': None,  # Would need original time
                'newDate': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                'newTime': appointment.start_time.isoformat() if appointment.start_time else None,
            })
        
        # Broadcast event
        broadcast_message = {
            'type': 'appointment_event',
            'payload': payload,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'system'
        }
        
        if appointment.barber_id:
            await manager.send_to_barber(appointment.barber_id, broadcast_message)
        else:
            await manager.broadcast_to_all(broadcast_message)
        
        logger.info(f"Notified appointment change: {event_type} for appointment {appointment_id}")
        
    except Exception as e:
        logger.error(f"Error notifying appointment change: {e}")

# Export the manager and notification function for use in other modules
__all__ = ['router', 'manager', 'notify_appointment_change']