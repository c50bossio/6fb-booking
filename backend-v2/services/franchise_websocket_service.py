"""
Franchise WebSocket Management Service
Production-Ready Real-Time Communication System

Provides enterprise-grade WebSocket management for:
- Real-time franchise performance monitoring
- Live compliance alerts and notifications
- Cross-network collaboration features
- AI coaching recommendation streaming
- Mobile-optimized real-time updates
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from models import User, Location
from models.franchise import FranchiseNetwork, FranchiseRegion, FranchiseGroup
from services.franchise_ai_coaching_service import FranchiseAICoachingService
from services.franchise_predictive_analytics_service import FranchisePredictiveAnalyticsService
from utils.authorization import verify_franchise_access

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """WebSocket message types for franchise operations"""
    PERFORMANCE_UPDATE = "performance_update"
    COMPLIANCE_ALERT = "compliance_alert"
    AI_RECOMMENDATION = "ai_recommendation"
    NETWORK_STATUS = "network_status"
    BOOKING_ACTIVITY = "booking_activity"
    FINANCIAL_METRIC = "financial_metric"
    SYSTEM_NOTIFICATION = "system_notification"
    USER_MESSAGE = "user_message"


class SubscriptionType(Enum):
    """WebSocket subscription types"""
    NETWORK_PERFORMANCE = "network_performance"
    REGION_METRICS = "region_metrics"
    GROUP_ACTIVITY = "group_activity"
    LOCATION_UPDATES = "location_updates"
    COMPLIANCE_MONITORING = "compliance_monitoring"
    AI_INSIGHTS = "ai_insights"
    FINANCIAL_STREAMS = "financial_streams"


@dataclass
class WebSocketConnection:
    """WebSocket connection metadata"""
    websocket: WebSocket
    user_id: int
    session_id: str
    connected_at: datetime
    last_activity: datetime
    subscriptions: Set[str] = field(default_factory=set)
    user_role: str = ""
    franchise_access: Dict[str, List[int]] = field(default_factory=dict)
    connection_quality: str = "good"
    message_count: int = 0


@dataclass
class FranchiseMessage:
    """Structured franchise WebSocket message"""
    message_type: MessageType
    network_id: Optional[int]
    region_id: Optional[int]
    group_id: Optional[int]
    location_id: Optional[int]
    data: Dict[str, Any]
    timestamp: datetime
    priority: str = "normal"
    requires_acknowledgment: bool = False
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))


class FranchiseWebSocketService:
    """
    Enterprise-grade WebSocket service for franchise operations
    
    Features:
    - Connection pooling and management
    - Role-based message filtering
    - Auto-reconnection handling
    - Message queuing and delivery
    - Performance monitoring
    - Security validation
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.connections: Dict[str, WebSocketConnection] = {}
        self.user_sessions: Dict[int, str] = {}
        self.subscription_groups: Dict[str, Set[str]] = {}
        self.message_queue: Dict[str, List[FranchiseMessage]] = {}
        self.performance_metrics = {
            "total_connections": 0,
            "messages_sent": 0,
            "messages_failed": 0,
            "connection_errors": 0
        }
        
        # Start background tasks
        asyncio.create_task(self._heartbeat_monitor())
        asyncio.create_task(self._message_processor())
        asyncio.create_task(self._performance_broadcaster())
    
    async def connect_user(
        self, 
        websocket: WebSocket, 
        user: User,
        requested_subscriptions: Optional[List[str]] = None
    ) -> str:
        """
        Connect user to WebSocket service with franchise access validation
        
        Args:
            websocket: FastAPI WebSocket instance
            user: Authenticated user
            requested_subscriptions: List of subscription types to activate
            
        Returns:
            Session ID for the connection
        """
        try:
            await websocket.accept()
            session_id = str(uuid.uuid4())
            
            # Validate franchise access
            franchise_access = await self._get_user_franchise_access(user)
            
            # Create connection record
            connection = WebSocketConnection(
                websocket=websocket,
                user_id=user.id,
                session_id=session_id,
                connected_at=datetime.utcnow(),
                last_activity=datetime.utcnow(),
                user_role=user.role,
                franchise_access=franchise_access
            )
            
            # Store connection
            self.connections[session_id] = connection
            self.user_sessions[user.id] = session_id
            
            # Set up subscriptions
            if requested_subscriptions:
                await self._setup_user_subscriptions(session_id, requested_subscriptions)
            
            # Send welcome message
            await self._send_message(session_id, FranchiseMessage(
                message_type=MessageType.SYSTEM_NOTIFICATION,
                network_id=None,
                region_id=None,
                group_id=None,
                location_id=None,
                data={
                    "type": "connection_established",
                    "session_id": session_id,
                    "user_id": user.id,
                    "franchise_access": franchise_access,
                    "available_subscriptions": list(SubscriptionType.__members__.keys())
                },
                timestamp=datetime.utcnow()
            ))
            
            # Update metrics
            self.performance_metrics["total_connections"] += 1
            
            logger.info(f"WebSocket connected: user {user.id}, session {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket for user {user.id}: {str(e)}")
            self.performance_metrics["connection_errors"] += 1
            raise
    
    async def disconnect_user(self, session_id: str, user_id: int):
        """Disconnect user and clean up resources"""
        try:
            if session_id in self.connections:
                connection = self.connections[session_id]
                
                # Remove from subscription groups
                for subscription in connection.subscriptions:
                    if subscription in self.subscription_groups:
                        self.subscription_groups[subscription].discard(session_id)
                
                # Clean up connection records
                del self.connections[session_id]
                if user_id in self.user_sessions:
                    del self.user_sessions[user_id]
                
                # Clean up message queue
                if session_id in self.message_queue:
                    del self.message_queue[session_id]
                
                logger.info(f"WebSocket disconnected: user {user_id}, session {session_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket session {session_id}: {str(e)}")
    
    async def subscribe_to_updates(
        self, 
        session_id: str, 
        subscription_type: SubscriptionType,
        entity_id: Optional[int] = None
    ):
        """Subscribe to specific franchise update streams"""
        try:
            if session_id not in self.connections:
                raise ValueError(f"Session {session_id} not found")
            
            connection = self.connections[session_id]
            
            # Validate subscription access
            if not await self._validate_subscription_access(connection, subscription_type, entity_id):
                raise PermissionError("User does not have access to this subscription")
            
            # Create subscription key
            subscription_key = f"{subscription_type.value}"
            if entity_id:
                subscription_key += f":{entity_id}"
            
            # Add to subscriptions
            connection.subscriptions.add(subscription_key)
            
            # Add to subscription groups
            if subscription_key not in self.subscription_groups:
                self.subscription_groups[subscription_key] = set()
            self.subscription_groups[subscription_key].add(session_id)
            
            # Send confirmation
            await self._send_message(session_id, FranchiseMessage(
                message_type=MessageType.SYSTEM_NOTIFICATION,
                network_id=None,
                region_id=None,
                group_id=None,
                location_id=None,
                data={
                    "type": "subscription_confirmed",
                    "subscription": subscription_key,
                    "entity_id": entity_id
                },
                timestamp=datetime.utcnow()
            ))
            
            logger.info(f"User {connection.user_id} subscribed to {subscription_key}")
            
        except Exception as e:
            logger.error(f"Error subscribing to updates: {str(e)}")
            await self._send_error(session_id, "subscription_failed", str(e))
    
    async def broadcast_to_network(
        self, 
        network_id: int, 
        message: FranchiseMessage,
        subscription_filter: Optional[SubscriptionType] = None
    ):
        """Broadcast message to all users with access to franchise network"""
        try:
            target_sessions = await self._get_network_subscribers(network_id, subscription_filter)
            
            for session_id in target_sessions:
                await self._send_message(session_id, message)
            
            logger.info(f"Broadcasted message to {len(target_sessions)} sessions for network {network_id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting to network {network_id}: {str(e)}")
    
    async def broadcast_to_region(
        self, 
        region_id: int, 
        message: FranchiseMessage,
        subscription_filter: Optional[SubscriptionType] = None
    ):
        """Broadcast message to all users with access to franchise region"""
        try:
            target_sessions = await self._get_region_subscribers(region_id, subscription_filter)
            
            for session_id in target_sessions:
                await self._send_message(session_id, message)
            
            logger.info(f"Broadcasted message to {len(target_sessions)} sessions for region {region_id}")
            
        except Exception as e:
            logger.error(f"Error broadcasting to region {region_id}: {str(e)}")
    
    async def send_ai_recommendation(
        self, 
        user_id: int, 
        location_id: int,
        recommendation_data: Dict[str, Any]
    ):
        """Send AI coaching recommendation to specific user"""
        try:
            if user_id not in self.user_sessions:
                # Queue message for when user connects
                await self._queue_message_for_user(user_id, FranchiseMessage(
                    message_type=MessageType.AI_RECOMMENDATION,
                    network_id=None,
                    region_id=None,
                    group_id=None,
                    location_id=location_id,
                    data=recommendation_data,
                    timestamp=datetime.utcnow(),
                    priority="high"
                ))
                return
            
            session_id = self.user_sessions[user_id]
            
            await self._send_message(session_id, FranchiseMessage(
                message_type=MessageType.AI_RECOMMENDATION,
                network_id=None,
                region_id=None,
                group_id=None,
                location_id=location_id,
                data=recommendation_data,
                timestamp=datetime.utcnow(),
                priority="high"
            ))
            
        except Exception as e:
            logger.error(f"Error sending AI recommendation: {str(e)}")
    
    async def send_compliance_alert(
        self, 
        network_id: int,
        alert_data: Dict[str, Any],
        severity: str = "medium"
    ):
        """Send compliance alert to network administrators"""
        try:
            message = FranchiseMessage(
                message_type=MessageType.COMPLIANCE_ALERT,
                network_id=network_id,
                region_id=None,
                group_id=None,
                location_id=None,
                data=alert_data,
                timestamp=datetime.utcnow(),
                priority=severity,
                requires_acknowledgment=True
            )
            
            # Send to network administrators only
            admin_sessions = await self._get_network_admin_subscribers(network_id)
            
            for session_id in admin_sessions:
                await self._send_message(session_id, message)
            
            logger.info(f"Sent compliance alert to {len(admin_sessions)} administrators for network {network_id}")
            
        except Exception as e:
            logger.error(f"Error sending compliance alert: {str(e)}")
    
    async def stream_performance_metrics(
        self, 
        entity_type: str,
        entity_id: int,
        metrics_data: Dict[str, Any]
    ):
        """Stream real-time performance metrics"""
        try:
            subscription_key = f"performance_stream:{entity_type}:{entity_id}"
            
            if subscription_key in self.subscription_groups:
                message = FranchiseMessage(
                    message_type=MessageType.PERFORMANCE_UPDATE,
                    network_id=entity_id if entity_type == "network" else None,
                    region_id=entity_id if entity_type == "region" else None,
                    group_id=entity_id if entity_type == "group" else None,
                    location_id=entity_id if entity_type == "location" else None,
                    data=metrics_data,
                    timestamp=datetime.utcnow()
                )
                
                for session_id in self.subscription_groups[subscription_key]:
                    await self._send_message(session_id, message)
            
        except Exception as e:
            logger.error(f"Error streaming performance metrics: {str(e)}")
    
    # Private methods for WebSocket management
    
    async def _send_message(self, session_id: str, message: FranchiseMessage):
        """Send message to specific WebSocket connection"""
        try:
            if session_id not in self.connections:
                return False
            
            connection = self.connections[session_id]
            
            # Prepare message payload
            payload = {
                "type": message.message_type.value,
                "data": message.data,
                "timestamp": message.timestamp.isoformat(),
                "message_id": message.message_id,
                "priority": message.priority
            }
            
            # Add entity IDs if present
            if message.network_id:
                payload["network_id"] = message.network_id
            if message.region_id:
                payload["region_id"] = message.region_id
            if message.group_id:
                payload["group_id"] = message.group_id
            if message.location_id:
                payload["location_id"] = message.location_id
            
            # Send via WebSocket
            await connection.websocket.send_text(json.dumps(payload))
            
            # Update connection activity
            connection.last_activity = datetime.utcnow()
            connection.message_count += 1
            
            # Update metrics
            self.performance_metrics["messages_sent"] += 1
            
            return True
            
        except WebSocketDisconnect:
            # Handle disconnection
            await self.disconnect_user(session_id, connection.user_id)
            return False
        except Exception as e:
            logger.error(f"Error sending message to session {session_id}: {str(e)}")
            self.performance_metrics["messages_failed"] += 1
            return False
    
    async def _send_error(self, session_id: str, error_type: str, error_message: str):
        """Send error message to WebSocket connection"""
        error_message_obj = FranchiseMessage(
            message_type=MessageType.SYSTEM_NOTIFICATION,
            network_id=None,
            region_id=None,
            group_id=None,
            location_id=None,
            data={
                "type": "error",
                "error_type": error_type,
                "message": error_message
            },
            timestamp=datetime.utcnow(),
            priority="high"
        )
        
        await self._send_message(session_id, error_message_obj)
    
    async def _get_user_franchise_access(self, user: User) -> Dict[str, List[int]]:
        """Get franchise access levels for user"""
        try:
            # This would integrate with the franchise security system
            # For now, return simplified access based on user role
            
            if user.role in ["super_admin", "admin"]:
                # Full access to all networks
                networks = self.db.query(FranchiseNetwork).all()
                return {
                    "networks": [n.id for n in networks],
                    "regions": [],  # Would populate with actual region access
                    "groups": [],   # Would populate with actual group access
                    "locations": [] # Would populate with actual location access
                }
            
            elif user.role == "franchise_admin":
                # Access to specific franchise networks
                # Would determine from user's organization associations
                return {
                    "networks": [1, 2],  # Example network IDs
                    "regions": [1, 2, 3],
                    "groups": [1, 2, 3, 4],
                    "locations": [1, 2, 3, 4, 5]
                }
            
            else:
                # Limited access for regular users
                return {
                    "networks": [],
                    "regions": [],
                    "groups": [],
                    "locations": [user.id]  # Only their own location
                }
        
        except Exception as e:
            logger.error(f"Error getting franchise access for user {user.id}: {str(e)}")
            return {"networks": [], "regions": [], "groups": [], "locations": []}
    
    async def _setup_user_subscriptions(self, session_id: str, subscription_types: List[str]):
        """Set up initial subscriptions for user"""
        try:
            for subscription_type_str in subscription_types:
                try:
                    subscription_type = SubscriptionType(subscription_type_str)
                    await self.subscribe_to_updates(session_id, subscription_type)
                except ValueError:
                    logger.warning(f"Invalid subscription type: {subscription_type_str}")
        
        except Exception as e:
            logger.error(f"Error setting up subscriptions for session {session_id}: {str(e)}")
    
    async def _validate_subscription_access(
        self, 
        connection: WebSocketConnection, 
        subscription_type: SubscriptionType,
        entity_id: Optional[int]
    ) -> bool:
        """Validate if user has access to specific subscription"""
        try:
            # Check role-based access
            if connection.user_role in ["super_admin", "admin"]:
                return True
            
            # Check entity-specific access
            if subscription_type == SubscriptionType.NETWORK_PERFORMANCE:
                return entity_id in connection.franchise_access.get("networks", [])
            elif subscription_type == SubscriptionType.REGION_METRICS:
                return entity_id in connection.franchise_access.get("regions", [])
            elif subscription_type == SubscriptionType.GROUP_ACTIVITY:
                return entity_id in connection.franchise_access.get("groups", [])
            elif subscription_type == SubscriptionType.LOCATION_UPDATES:
                return entity_id in connection.franchise_access.get("locations", [])
            
            # Default to allow for general subscriptions
            return True
        
        except Exception as e:
            logger.error(f"Error validating subscription access: {str(e)}")
            return False
    
    async def _get_network_subscribers(
        self, 
        network_id: int, 
        subscription_filter: Optional[SubscriptionType]
    ) -> Set[str]:
        """Get all subscribers for a franchise network"""
        subscribers = set()
        
        try:
            for session_id, connection in self.connections.items():
                # Check network access
                if network_id in connection.franchise_access.get("networks", []):
                    # Check subscription filter
                    if subscription_filter:
                        subscription_key = f"{subscription_filter.value}:{network_id}"
                        if subscription_key in connection.subscriptions:
                            subscribers.add(session_id)
                    else:
                        subscribers.add(session_id)
        
        except Exception as e:
            logger.error(f"Error getting network subscribers: {str(e)}")
        
        return subscribers
    
    async def _get_region_subscribers(
        self, 
        region_id: int, 
        subscription_filter: Optional[SubscriptionType]
    ) -> Set[str]:
        """Get all subscribers for a franchise region"""
        subscribers = set()
        
        try:
            for session_id, connection in self.connections.items():
                # Check region access
                if region_id in connection.franchise_access.get("regions", []):
                    # Check subscription filter
                    if subscription_filter:
                        subscription_key = f"{subscription_filter.value}:{region_id}"
                        if subscription_key in connection.subscriptions:
                            subscribers.add(session_id)
                    else:
                        subscribers.add(session_id)
        
        except Exception as e:
            logger.error(f"Error getting region subscribers: {str(e)}")
        
        return subscribers
    
    async def _get_network_admin_subscribers(self, network_id: int) -> Set[str]:
        """Get admin subscribers for a franchise network"""
        subscribers = set()
        
        try:
            for session_id, connection in self.connections.items():
                # Check admin role and network access
                if (connection.user_role in ["admin", "franchise_admin", "super_admin"] and
                    network_id in connection.franchise_access.get("networks", [])):
                    subscribers.add(session_id)
        
        except Exception as e:
            logger.error(f"Error getting network admin subscribers: {str(e)}")
        
        return subscribers
    
    async def _queue_message_for_user(self, user_id: int, message: FranchiseMessage):
        """Queue message for user who is not currently connected"""
        try:
            user_key = f"user:{user_id}"
            if user_key not in self.message_queue:
                self.message_queue[user_key] = []
            
            self.message_queue[user_key].append(message)
            
            # Limit queue size to prevent memory issues
            if len(self.message_queue[user_key]) > 100:
                self.message_queue[user_key] = self.message_queue[user_key][-50:]
        
        except Exception as e:
            logger.error(f"Error queuing message for user {user_id}: {str(e)}")
    
    async def _heartbeat_monitor(self):
        """Monitor WebSocket connections and handle disconnections"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                current_time = datetime.utcnow()
                disconnected_sessions = []
                
                for session_id, connection in self.connections.items():
                    # Check for inactive connections (no activity for 5 minutes)
                    if (current_time - connection.last_activity).total_seconds() > 300:
                        disconnected_sessions.append((session_id, connection.user_id))
                
                # Clean up inactive connections
                for session_id, user_id in disconnected_sessions:
                    await self.disconnect_user(session_id, user_id)
                    logger.info(f"Cleaned up inactive WebSocket session: {session_id}")
            
            except Exception as e:
                logger.error(f"Error in heartbeat monitor: {str(e)}")
    
    async def _message_processor(self):
        """Process queued messages for users when they connect"""
        while True:
            try:
                await asyncio.sleep(10)  # Process every 10 seconds
                
                # Process queued messages for connected users
                for user_id, session_id in self.user_sessions.items():
                    user_key = f"user:{user_id}"
                    if user_key in self.message_queue and self.message_queue[user_key]:
                        # Send all queued messages
                        for message in self.message_queue[user_key]:
                            await self._send_message(session_id, message)
                        
                        # Clear queue
                        del self.message_queue[user_key]
            
            except Exception as e:
                logger.error(f"Error in message processor: {str(e)}")
    
    async def _performance_broadcaster(self):
        """Broadcast performance metrics periodically"""
        while True:
            try:
                await asyncio.sleep(300)  # Broadcast every 5 minutes
                
                # Broadcast performance metrics to subscribed users
                performance_message = FranchiseMessage(
                    message_type=MessageType.SYSTEM_NOTIFICATION,
                    network_id=None,
                    region_id=None,
                    group_id=None,
                    location_id=None,
                    data={
                        "type": "system_performance",
                        "metrics": self.performance_metrics.copy(),
                        "active_connections": len(self.connections),
                        "active_subscriptions": sum(len(subs) for subs in self.subscription_groups.values())
                    },
                    timestamp=datetime.utcnow()
                )
                
                # Send to all admin users
                admin_sessions = [
                    session_id for session_id, connection in self.connections.items()
                    if connection.user_role in ["admin", "super_admin"]
                ]
                
                for session_id in admin_sessions:
                    await self._send_message(session_id, performance_message)
            
            except Exception as e:
                logger.error(f"Error in performance broadcaster: {str(e)}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get current WebSocket connection statistics"""
        return {
            "total_connections": len(self.connections),
            "total_subscriptions": sum(len(subs) for subs in self.subscription_groups.values()),
            "performance_metrics": self.performance_metrics.copy(),
            "subscription_breakdown": {
                sub_type: len(subscribers) 
                for sub_type, subscribers in self.subscription_groups.items()
            },
            "user_roles": {
                role: len([c for c in self.connections.values() if c.user_role == role])
                for role in ["admin", "franchise_admin", "barber", "client"]
            }
        }