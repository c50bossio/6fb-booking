# WebSocket Real-Time Notifications Implementation

## Overview
The 6FB Platform now supports real-time notifications using WebSocket technology, providing instant updates to users without requiring page refreshes.

## Architecture

### Backend Components

#### 1. WebSocket Connection Manager (`/backend/websocket/connection_manager.py`)
- Manages active WebSocket connections
- Tracks connections by user ID and location ID
- Handles connection lifecycle (connect, disconnect, reconnect)
- Provides methods for sending targeted messages:
  - `send_personal_message()` - Send to specific user
  - `send_location_message()` - Send to all users at a location
  - `broadcast()` - Send to all connected users
  - `send_notification()` - Send typed notifications

#### 2. WebSocket Endpoint (`/backend/api/v1/websocket.py`)
- Main WebSocket endpoint at `/api/v1/ws`
- JWT authentication via query parameter
- Handles incoming messages and maintains connection
- Provides connection status endpoint

#### 3. Notification Service (`/backend/services/notification_service.py`)
- High-level service for sending notifications
- Notification types:
  - Appointment notifications (booking, cancellation, reminder)
  - Performance alerts
  - Team updates
  - Training notifications
  - Revenue milestones
- Stores notifications in database for persistence
- Sends real-time updates via WebSocket

#### 4. Notification Model (`/backend/models/notification.py`)
- Database model for persistent notifications
- Fields: type, priority, title, message, data, read status
- Supports expiring notifications
- Tracks read timestamps

#### 5. Notification API (`/backend/api/v1/notifications.py`)
- RESTful endpoints for notification management
- Get all notifications (with pagination)
- Get unread notifications
- Mark as read (single or all)
- Delete notifications
- Get unread count

### Frontend Components

#### 1. WebSocket Hook (`/frontend/src/hooks/useWebSocket.ts`)
- React hook for WebSocket connection management
- Features:
  - Auto-connect on mount
  - Auto-reconnect with exponential backoff
  - Connection status tracking
  - Message handling and routing
  - Heartbeat/ping to maintain connection
  - Browser notification integration

#### 2. Notification Center (`/frontend/src/components/NotificationCenter.tsx`)
- UI component for displaying notifications
- Features:
  - Real-time notification display
  - Unread count badge
  - Mark as read functionality
  - Clear notifications
  - Time-based formatting
  - Icon-based notification types
  - Sound alerts

#### 3. Notification API Service (`/frontend/src/lib/api/notifications.ts`)
- TypeScript API client for notification endpoints
- Type-safe notification interfaces
- Methods for all notification operations

## Features

### Real-Time Updates
- Instant notification delivery
- No polling required
- Low latency communication
- Bi-directional messaging

### Connection Management
- Automatic reconnection on disconnect
- Exponential backoff for reconnection attempts
- Connection status indicators
- Heartbeat mechanism to detect stale connections

### Notification Types
1. **Appointment Notifications**
   - New booking
   - Cancellation
   - Reminder
   - No-show alert

2. **Performance Alerts**
   - Metrics threshold exceeded
   - Goal achievement
   - Performance trends

3. **Team Updates**
   - Location-wide announcements
   - Schedule changes
   - Policy updates

4. **Training Notifications**
   - Course completion
   - New module available
   - Certification expiry

5. **Achievement Notifications**
   - Revenue milestones
   - Performance achievements
   - Celebration animations

### Security
- JWT-based authentication
- Secure WebSocket (WSS) in production
- User-specific message routing
- Permission-based notification filtering

## Usage Examples

### Backend - Sending Notifications

```python
from services.notification_service import NotificationService

# Send appointment notification
await NotificationService.send_appointment_notification(
    db=db,
    user_id=barber_user_id,
    appointment_data={
        "appointment_id": appointment.id,
        "client_name": appointment.client_name,
        "service": appointment.service_name,
        "time": appointment.appointment_time,
        "message": f"New appointment booked with {appointment.client_name}"
    },
    notification_type="new_booking"
)

# Send performance alert
await NotificationService.send_performance_alert(
    db=db,
    user_id=user_id,
    metric_type="booking_rate",
    current_value=85.5,
    threshold=90.0,
    trend="decreasing"
)

# Send team update
await NotificationService.send_team_update(
    db=db,
    location_id=location_id,
    update_type="schedule_change",
    data={
        "message": "Holiday hours in effect next week",
        "details": {...}
    }
)
```

### Frontend - Using WebSocket Hook

```typescript
import { useWebSocket } from '@/hooks/useWebSocket'

function MyComponent() {
  const { isConnected, sendMessage, lastMessage, connectionStatus } = useWebSocket()

  // React to new messages
  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      // Handle notification
      console.log('New notification:', lastMessage.data)
    }
  }, [lastMessage])

  // Send message to server
  const subscribe = () => {
    sendMessage({
      type: 'subscribe',
      event_type: 'performance_updates'
    })
  }

  return (
    <div>
      Status: {connectionStatus}
      {isConnected && <button onClick={subscribe}>Subscribe</button>}
    </div>
  )
}
```

## Configuration

### Environment Variables

Backend:
```env
# WebSocket configuration
WS_HEARTBEAT_INTERVAL=30  # seconds
WS_MAX_CONNECTIONS_PER_USER=5
WS_RECONNECT_MAX_ATTEMPTS=5
```

Frontend:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000  # Development
NEXT_PUBLIC_WS_URL=wss://api.6fbplatform.com  # Production
```

### Nginx Configuration (Production)

```nginx
location /api/v1/ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

## Monitoring

### Metrics
- Active connections count
- Messages sent/received per second
- Connection duration
- Reconnection attempts
- Error rates

### Health Checks
- WebSocket connection status endpoint: `/api/v1/ws/status`
- Returns connection statistics

## Browser Support
- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+
- Mobile browsers (iOS Safari, Chrome for Android)

## Performance Considerations
- Each WebSocket connection uses minimal resources
- Messages are JSON-encoded for efficiency
- Heartbeat prevents idle connection timeout
- Automatic cleanup of stale connections
- Rate limiting on message frequency

## Future Enhancements
1. Message delivery confirmation
2. Offline message queue
3. Push notifications for mobile
4. Message encryption
5. Presence indicators
6. Typing indicators
7. Read receipts
8. Group messaging channels
