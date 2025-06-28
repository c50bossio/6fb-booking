"""
WebSocket connection manager for real-time notifications
"""

from typing import Dict, List, Set
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""

    def __init__(self):
        # Active connections by user ID
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Active connections by location ID for location-wide broadcasts
        self.location_connections: Dict[int, Set[int]] = {}
        # Connection metadata
        self.connection_info: Dict[WebSocket, dict] = {}

    async def connect(
        self, websocket: WebSocket, user_id: int, location_id: int = None
    ):
        """Accept and track a new WebSocket connection"""
        await websocket.accept()

        # Add to user connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

        # Add to location connections if provided
        if location_id:
            if location_id not in self.location_connections:
                self.location_connections[location_id] = set()
            self.location_connections[location_id].add(user_id)

        # Store connection metadata
        self.connection_info[websocket] = {
            "user_id": user_id,
            "location_id": location_id,
            "connected_at": datetime.utcnow(),
            "last_ping": datetime.utcnow(),
        }

        logger.info(f"User {user_id} connected via WebSocket")

        # Send welcome message
        await self.send_personal_message(
            {
                "type": "connection",
                "status": "connected",
                "message": "Connected to 6FB Platform real-time updates",
                "timestamp": datetime.utcnow().isoformat(),
            },
            user_id,
        )

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.connection_info:
            info = self.connection_info[websocket]
            user_id = info["user_id"]
            location_id = info.get("location_id")

            # Remove from user connections
            if user_id in self.active_connections:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

            # Remove from location connections
            if location_id and location_id in self.location_connections:
                self.location_connections[location_id].discard(user_id)
                if not self.location_connections[location_id]:
                    del self.location_connections[location_id]

            # Remove connection info
            del self.connection_info[websocket]

            logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            message_json = json.dumps(message)
            dead_connections = []

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_connections.append(connection)

            # Clean up dead connections
            for connection in dead_connections:
                self.disconnect(connection)

    async def send_location_message(self, message: dict, location_id: int):
        """Send a message to all users at a specific location"""
        if location_id in self.location_connections:
            message_json = json.dumps(message)

            for user_id in self.location_connections[location_id]:
                await self.send_personal_message(message, user_id)

    async def broadcast(self, message: dict, exclude_user: int = None):
        """Broadcast a message to all connected users"""
        message_json = json.dumps(message)
        dead_connections = []

        for user_id, connections in self.active_connections.items():
            if user_id == exclude_user:
                continue

            for connection in connections:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
                    dead_connections.append(connection)

        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)

    async def send_notification(self, user_id: int, notification_type: str, data: dict):
        """Send a typed notification to a user"""
        message = {
            "type": "notification",
            "notification_type": notification_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        await self.send_personal_message(message, user_id)

    async def handle_message(self, websocket: WebSocket, user_id: int):
        """Handle incoming WebSocket messages"""
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                # Update last ping time
                if websocket in self.connection_info:
                    self.connection_info[websocket]["last_ping"] = datetime.utcnow()

                # Handle different message types
                if message.get("type") == "ping":
                    # Respond to ping
                    await websocket.send_text(
                        json.dumps(
                            {"type": "pong", "timestamp": datetime.utcnow().isoformat()}
                        )
                    )

                elif message.get("type") == "subscribe":
                    # Subscribe to specific events
                    event_type = message.get("event_type")
                    logger.info(f"User {user_id} subscribed to {event_type}")
                    # TODO: Implement event subscription logic

                else:
                    logger.warning(
                        f"Unknown message type from user {user_id}: {message}"
                    )

        except Exception as e:
            logger.error(f"Error handling message from user {user_id}: {e}")
            self.disconnect(websocket)

    def get_connection_count(self) -> dict:
        """Get statistics about active connections"""
        total_users = len(self.active_connections)
        total_connections = sum(
            len(conns) for conns in self.active_connections.values()
        )

        return {
            "total_users": total_users,
            "total_connections": total_connections,
            "by_location": {
                loc_id: len(users)
                for loc_id, users in self.location_connections.items()
            },
        }


# Global connection manager instance
manager = ConnectionManager()
