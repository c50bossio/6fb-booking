"""
Tests for WebSocket functionality
"""
import pytest
import asyncio
import json
from unittest.mock import MagicMock, AsyncMock
from fastapi import WebSocket
from websocket.connection_manager import ConnectionManager
from services.notification_service import NotificationService
from models.notification import Notification, NotificationType, NotificationPriority

@pytest.fixture
def connection_manager():
    return ConnectionManager()

@pytest.fixture
def mock_websocket():
    ws = MagicMock(spec=WebSocket)
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.close = AsyncMock()
    ws.client = MagicMock()
    ws.client.host = "127.0.0.1"
    ws.client.port = 12345
    return ws

class TestConnectionManager:
    """Test WebSocket connection manager"""
    
    @pytest.mark.asyncio
    async def test_connect_user(self, connection_manager, mock_websocket):
        """Test connecting a user"""
        user_id = 123
        location_id = 1
        
        await connection_manager.connect(mock_websocket, user_id, location_id)
        
        assert user_id in connection_manager.active_connections
        assert mock_websocket in connection_manager.active_connections[user_id]
        assert location_id in connection_manager.location_connections
        assert user_id in connection_manager.location_connections[location_id]
    
    @pytest.mark.asyncio
    async def test_disconnect_user(self, connection_manager, mock_websocket):
        """Test disconnecting a user"""
        user_id = 123
        location_id = 1
        
        # Connect first
        await connection_manager.connect(mock_websocket, user_id, location_id)
        
        # Then disconnect
        connection_manager.disconnect(mock_websocket, user_id)
        
        assert user_id not in connection_manager.active_connections
        assert user_id not in connection_manager.location_connections.get(location_id, set())
    
    @pytest.mark.asyncio
    async def test_multiple_connections_same_user(self, connection_manager):
        """Test multiple connections from same user"""
        user_id = 123
        location_id = 1
        
        ws1 = MagicMock(spec=WebSocket)
        ws1.send_json = AsyncMock()
        ws2 = MagicMock(spec=WebSocket)
        ws2.send_json = AsyncMock()
        
        await connection_manager.connect(ws1, user_id, location_id)
        await connection_manager.connect(ws2, user_id, location_id)
        
        assert len(connection_manager.active_connections[user_id]) == 2
        assert ws1 in connection_manager.active_connections[user_id]
        assert ws2 in connection_manager.active_connections[user_id]
    
    @pytest.mark.asyncio
    async def test_send_personal_message(self, connection_manager, mock_websocket):
        """Test sending message to specific user"""
        user_id = 123
        location_id = 1
        message = {"type": "test", "data": "hello"}
        
        await connection_manager.connect(mock_websocket, user_id, location_id)
        await connection_manager.send_personal_message(user_id, message)
        
        mock_websocket.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_send_location_message(self, connection_manager):
        """Test sending message to all users at location"""
        location_id = 1
        message = {"type": "location_update", "data": "announcement"}
        
        # Connect multiple users to same location
        users = []
        for i in range(3):
            ws = MagicMock(spec=WebSocket)
            ws.send_json = AsyncMock()
            users.append((i, ws))
            await connection_manager.connect(ws, i, location_id)
        
        await connection_manager.send_location_message(location_id, message)
        
        # All users should receive the message
        for _, ws in users:
            ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_broadcast(self, connection_manager):
        """Test broadcasting to all connected users"""
        message = {"type": "broadcast", "data": "global announcement"}
        
        # Connect multiple users
        users = []
        for i in range(5):
            ws = MagicMock(spec=WebSocket)
            ws.send_json = AsyncMock()
            users.append(ws)
            await connection_manager.connect(ws, i, i % 2)  # Different locations
        
        await connection_manager.broadcast(message)
        
        # All users should receive the message
        for ws in users:
            ws.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_send_notification(self, connection_manager, mock_websocket):
        """Test sending typed notification"""
        user_id = 123
        location_id = 1
        
        await connection_manager.connect(mock_websocket, user_id, location_id)
        
        notification = Notification(
            user_id=user_id,
            type=NotificationType.APPOINTMENT,
            priority=NotificationPriority.HIGH,
            title="New Appointment",
            message="You have a new appointment",
            data={"appointment_id": 456}
        )
        
        await connection_manager.send_notification(user_id, notification)
        
        expected_message = {
            "type": "notification",
            "data": {
                "id": notification.id,
                "notification_type": notification.type.value,
                "priority": notification.priority.value,
                "title": notification.title,
                "message": notification.message,
                "data": notification.data,
                "created_at": notification.created_at.isoformat(),
                "read": notification.read
            }
        }
        
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "notification"
        assert call_args["data"]["title"] == "New Appointment"
    
    @pytest.mark.asyncio
    async def test_connection_error_handling(self, connection_manager):
        """Test handling of connection errors"""
        user_id = 123
        location_id = 1
        
        # Mock websocket that raises exception on send
        ws = MagicMock(spec=WebSocket)
        ws.send_json = AsyncMock(side_effect=Exception("Connection closed"))
        
        await connection_manager.connect(ws, user_id, location_id)
        
        # Should not raise exception
        await connection_manager.send_personal_message(user_id, {"test": "data"})
        
        # Connection should be automatically removed
        assert user_id not in connection_manager.active_connections
    
    def test_get_connection_stats(self, connection_manager):
        """Test getting connection statistics"""
        stats = connection_manager.get_stats()
        
        assert "total_connections" in stats
        assert "users_connected" in stats
        assert "connections_by_location" in stats
        assert stats["total_connections"] == 0
        assert stats["users_connected"] == 0

class TestNotificationService:
    """Test notification service WebSocket integration"""
    
    @pytest.mark.asyncio
    async def test_send_appointment_notification(self, connection_manager):
        """Test sending appointment notification through WebSocket"""
        user_id = 123
        location_id = 1
        
        ws = MagicMock(spec=WebSocket)
        ws.send_json = AsyncMock()
        
        await connection_manager.connect(ws, user_id, location_id)
        
        # Mock the service to use our connection manager
        NotificationService.manager = connection_manager
        
        # Send appointment notification
        appointment_data = {
            "appointment_id": 456,
            "client_name": "John Doe",
            "service": "Haircut",
            "time": "2024-01-15 10:00",
            "message": "New appointment booked"
        }
        
        # Create mock DB session
        mock_db = MagicMock()
        
        await NotificationService.send_appointment_notification(
            db=mock_db,
            user_id=user_id,
            appointment_data=appointment_data,
            notification_type="new_booking"
        )
        
        # Verify WebSocket message was sent
        ws.send_json.assert_called()
        call_args = ws.send_json.call_args[0][0]
        assert call_args["type"] == "notification"
        assert "appointment_id" in call_args["data"]["data"]
    
    @pytest.mark.asyncio
    async def test_websocket_heartbeat(self, mock_websocket):
        """Test WebSocket heartbeat mechanism"""
        # Test ping/pong
        ping_message = {"type": "ping"}
        pong_response = {"type": "pong"}
        
        # Simulate receiving ping
        mock_websocket.receive_json = AsyncMock(return_value=ping_message)
        
        # Should respond with pong
        await mock_websocket.send_json(pong_response)
        mock_websocket.send_json.assert_called_with(pong_response)