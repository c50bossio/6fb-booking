# Google Calendar Webhook System for BookedBarber V2

## Overview

The Google Calendar Webhook System provides real-time synchronization between BookedBarber appointments and Google Calendar events. This system eliminates sync delays by receiving immediate notifications when calendar events change, ensuring that appointment data stays synchronized across both platforms.

## Architecture

### Core Components

1. **Database Models** (`models/google_calendar_webhook.py`)
   - `GoogleCalendarWebhookSubscription`: Tracks webhook subscriptions
   - `GoogleCalendarWebhookNotification`: Logs incoming notifications
   - `GoogleCalendarSyncEvent`: Records individual sync operations
   - `GoogleCalendarConflictResolution`: Manages sync conflicts

2. **Webhook Service** (`services/google_calendar_webhook_service.py`)
   - Manages subscription lifecycle (create, renew, delete)
   - Processes incoming webhook notifications
   - Handles incremental sync operations
   - Provides conflict resolution logic

3. **Webhook Endpoints** (`api/v2/endpoints/google_calendar_webhook.py`)
   - `/api/v2/webhooks/google-calendar`: Main webhook receiver
   - Security validation and signature verification
   - Background processing for non-blocking responses

4. **Enhanced Calendar Service** (`services/google_calendar_service.py`)
   - Automatic webhook subscription management
   - Enhanced sync operations with audit logging
   - Real-time sync enable/disable functionality

5. **Background Worker** (`workers/google_calendar_webhook_worker.py`)
   - Automatic subscription renewal
   - Cleanup of expired subscriptions
   - Health monitoring and alerting

## Key Features

### Real-time Synchronization
- Immediate notification when Google Calendar events change
- Automatic creation, update, and deletion of appointments
- Bidirectional sync with conflict resolution

### Subscription Management
- Automatic subscription creation when users connect Google Calendar
- Proactive renewal before expiration (24-hour TTL)
- Graceful handling of expired or failed subscriptions

### Security & Reliability
- Webhook signature verification
- Token-based authentication
- Comprehensive error handling and retry logic
- Idempotency to prevent duplicate processing

### Monitoring & Observability
- Detailed audit logs for all sync operations
- Health monitoring with scoring system
- Error tracking and alerting
- Performance metrics and statistics

## API Endpoints

### Webhook Management

#### Enable Real-time Sync
```http
POST /api/v2/calendar/real-time-sync/enable
Authorization: Bearer <token>
```

Creates webhook subscription for immediate calendar notifications.

#### Disable Real-time Sync
```http
POST /api/v2/calendar/real-time-sync/disable
Authorization: Bearer <token>
```

Removes webhook subscriptions to stop real-time notifications.

#### Get Sync Status
```http
GET /api/v2/calendar/real-time-sync/status
Authorization: Bearer <token>
```

Returns comprehensive sync status including webhook health.

#### Renew Subscriptions
```http
POST /api/v2/calendar/webhooks/renew
Authorization: Bearer <token>
```

Manually renew expiring webhook subscriptions.

#### Health Check
```http
GET /api/v2/calendar/sync/health
Authorization: Bearer <token>
```

Get detailed health status with recommendations.

### Webhook Receiver (Internal)

#### Google Calendar Webhook
```http
POST /api/v2/webhooks/google-calendar
X-Goog-Channel-ID: <subscription_id>
X-Goog-Resource-ID: <resource_id>
X-Goog-Resource-State: <state>
Content-Type: application/json
```

Receives push notifications from Google Calendar.

## Configuration

### Environment Variables

```bash
# Webhook configuration
WEBHOOK_BASE_URL=https://app.bookedbarber.com
WEBHOOK_TTL_HOURS=24
GOOGLE_WEBHOOK_SECRET=your_webhook_secret

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
```

### Database Migration

Apply the webhook system migration:

```bash
cd backend-v2
alembic upgrade head
```

This creates the necessary tables for webhook tracking and sync management.

## Workflow

### Initial Setup

1. **User Connects Google Calendar**
   - OAuth2 flow stores credentials
   - Automatic webhook subscription created
   - Real-time sync enabled by default

2. **Webhook Subscription Process**
   ```
   BookedBarber → Google Calendar API → Watch Request
   Google Calendar → Webhook Subscription → Confirmation
   ```

### Real-time Sync Flow

1. **Event Change in Google Calendar**
   ```
   Google Calendar Event Change → Push Notification → BookedBarber Webhook
   ```

2. **Webhook Processing**
   ```
   Webhook Received → Validation → Background Processing → Sync Operation
   ```

3. **Sync Operation**
   ```
   Incremental Sync → Event Processing → Conflict Resolution → Database Update
   ```

### Subscription Lifecycle

1. **Creation**: Automatic when user connects Google Calendar
2. **Renewal**: Background worker renews before expiration
3. **Health Monitoring**: Continuous monitoring of subscription status
4. **Cleanup**: Automatic removal of expired/failed subscriptions

## Error Handling & Recovery

### Webhook Failures
- Automatic retry mechanism with exponential backoff
- Dead letter queue for permanently failed notifications
- Error tracking and alerting for debugging

### Subscription Issues
- Automatic renewal before expiration
- Fallback to manual sync if webhook fails
- Health monitoring with proactive alerts

### Sync Conflicts
- Intelligent conflict resolution strategies
- Manual review queue for complex conflicts
- Audit trail for all resolution decisions

## Monitoring & Observability

### Health Scoring
- Subscription coverage ratio
- Error rate monitoring
- Response time tracking
- Success rate measurement

### Metrics Tracked
- Active webhook subscriptions
- Notification processing rates
- Sync operation success/failure
- Conflict resolution statistics

### Alerting
- High error rates (>10%)
- Subscription expiration warnings
- Failed renewal attempts
- Stale subscriptions (no notifications >48h)

## Security Considerations

### Webhook Security
- Signature verification using HMAC-SHA256
- Token-based authentication for additional security
- Rate limiting to prevent abuse
- Input validation and sanitization

### Data Protection
- Minimal data storage in webhook logs
- Automatic cleanup of old notification data
- Secure credential storage and refresh

### Access Control
- User-specific webhook subscriptions
- Proper authorization checks
- Audit trail for all operations

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Notifications
1. Check subscription status: `GET /api/v2/calendar/real-time-sync/status`
2. Verify webhook URL accessibility
3. Check Google Calendar API quotas
4. Review error logs in webhook notifications

#### Sync Conflicts
1. Review conflict resolution logs
2. Check for competing calendar applications
3. Verify event ownership and permissions
4. Use manual sync as fallback

#### High Error Rates
1. Check Google Calendar API credentials
2. Verify network connectivity
3. Review webhook signature validation
4. Check for rate limiting issues

### Debug Commands

```bash
# Check webhook health
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v2/calendar/sync/health

# Force subscription renewal
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v2/calendar/webhooks/renew

# Get sync logs
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v2/calendar/sync-logs?limit=50
```

### Log Analysis

Key log patterns to monitor:
- `Google Calendar webhook worker started` - Worker initialization
- `Created webhook subscription` - Successful subscription
- `Renewed webhook subscription` - Successful renewal
- `ALERT: High webhook error rate` - Critical issues

## Performance Considerations

### Optimization Strategies
- Background processing for webhook handling
- Efficient incremental sync using sync tokens
- Batch processing for multiple events
- Connection pooling for database operations

### Scalability
- Horizontal scaling of webhook workers
- Database indexing for fast lookups
- Caching of frequently accessed data
- Load balancing for webhook endpoints

## Six Figure Barber Alignment

The webhook system supports the Six Figure Barber methodology by:

1. **Revenue Optimization**: Real-time sync prevents scheduling conflicts and missed appointments
2. **Client Experience**: Immediate calendar updates improve client satisfaction
3. **Business Efficiency**: Reduces manual sync overhead and errors
4. **Professional Growth**: Reliable calendar integration supports business scaling
5. **Data Integrity**: Comprehensive audit trails support business analytics

## Future Enhancements

### Planned Features
- Multi-calendar support for complex business setups
- Advanced conflict resolution with AI assistance
- Integration with other calendar providers (Outlook, Apple)
- Real-time analytics dashboard for sync performance

### Performance Improvements
- WebSocket support for instant notifications
- Smart batching for high-volume operations
- Predictive subscription renewal
- Advanced caching strategies

## Support

For technical support or questions:
- Review the health check endpoint for system status
- Check the comprehensive logging for debugging
- Monitor error rates and subscription health
- Use manual sync as fallback when needed

The Google Calendar Webhook System provides enterprise-grade real-time synchronization, ensuring that BookedBarber appointments and Google Calendar events stay perfectly synchronized for an optimal user experience.