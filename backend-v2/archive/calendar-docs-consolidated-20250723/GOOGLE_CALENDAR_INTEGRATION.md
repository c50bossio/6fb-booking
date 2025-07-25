# Google Calendar Integration for 6FB Booking V2

This document provides comprehensive information about the Google Calendar integration implementation for the 6FB Booking platform V2.

## Overview

The Google Calendar integration provides seamless two-way synchronization between the 6FB booking system and Google Calendar. Barbers can connect their Google Calendar accounts to automatically sync appointments, check availability, and prevent double-bookings.

## Features

- **OAuth2 Authentication**: Secure connection to Google Calendar accounts
- **Two-way Synchronization**: Sync V2 appointments to Google Calendar and vice versa
- **Availability Checking**: Check Google Calendar for conflicts before booking
- **Automatic Sync**: Appointments are automatically synced when created, updated, or deleted
- **Conflict Detection**: Detect and report calendar conflicts
- **Timezone Support**: Proper timezone handling for different user locations
- **Bulk Operations**: Sync multiple appointments at once
- **Cleanup Tools**: Remove orphaned calendar events

## Architecture

### Core Components

1. **GoogleCalendarService** (`services/google_calendar_service.py`)
   - Handles Google Calendar API interactions
   - Manages OAuth2 credentials and authentication
   - Provides calendar event CRUD operations
   - Handles availability checking and free/busy queries

2. **CalendarSyncService** (`services/calendar_sync_service.py`)
   - Provides automatic synchronization hooks
   - Handles conflict detection and resolution
   - Manages bulk sync operations
   - Provides sync status tracking

3. **Calendar Router** (`routers/calendar.py`)
   - RESTful API endpoints for calendar operations
   - OAuth2 flow management
   - User-facing calendar management features

4. **Timezone Utilities** (`utils/timezone.py`)
   - Timezone conversion and formatting
   - Google Calendar API datetime formatting
   - User timezone preferences

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth2 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/v1/calendar/callback` (development)
     - `https://yourdomain.com/api/v1/calendar/callback` (production)

### 2. Configuration

Update your `config.py` or environment variables:

```python
# Google Calendar OAuth2 settings
google_client_id: str = "your_google_client_id"
google_client_secret: str = "your_google_client_secret"
google_redirect_uri: str = "http://localhost:8000/api/v1/calendar/callback"
google_calendar_scopes: list = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
]
```

### 3. Database Migration

The integration requires a new field in the appointments table:

```bash
# Run the migration to add google_event_id field
alembic upgrade head
```

## API Endpoints

### Authentication

#### Connect Google Calendar
- **Endpoint**: `GET /api/v1/calendar/auth`
- **Description**: Initiate Google Calendar OAuth2 flow
- **Response**: Authorization URL for user to visit

#### OAuth Callback
- **Endpoint**: `GET /api/v1/calendar/callback`
- **Description**: Handle OAuth2 callback from Google
- **Parameters**: `code`, `state`
- **Response**: Redirect to frontend with status

#### Check Connection Status
- **Endpoint**: `GET /api/v1/calendar/status`
- **Description**: Check if user's Google Calendar is connected and valid
- **Response**: Connection status information

#### Disconnect Calendar
- **Endpoint**: `DELETE /api/v1/calendar/disconnect`
- **Description**: Disconnect Google Calendar integration
- **Response**: Success message

### Calendar Management

#### List Calendars
- **Endpoint**: `GET /api/v1/calendar/list`
- **Description**: List user's available Google Calendars
- **Response**: Array of calendar objects

#### Select Calendar
- **Endpoint**: `POST /api/v1/calendar/select-calendar`
- **Body**: `{\"calendar_id\": \"calendar_id_here\"}`
- **Description**: Select which calendar to use for syncing
- **Response**: Success message

### Availability Checking

#### Check Time Slot Availability
- **Endpoint**: `GET /api/v1/calendar/availability`
- **Parameters**: `start_time`, `end_time`
- **Description**: Check if a time slot is available in Google Calendar
- **Response**: `{\"available\": true/false}`

#### Get Free/Busy Information
- **Endpoint**: `GET /api/v1/calendar/free-busy`
- **Parameters**: `start_date`, `end_date`
- **Description**: Get detailed free/busy information
- **Response**: List of busy periods

### Appointment Synchronization

#### Sync Single Appointment
- **Endpoint**: `POST /api/v1/calendar/sync-appointment/{appointment_id}`
- **Description**: Manually sync a specific appointment to Google Calendar
- **Response**: Google event ID

#### Bulk Sync Appointments
- **Endpoint**: `POST /api/v1/calendar/sync-appointments`
- **Body**: `{\"start_date\": \"2025-07-01\", \"end_date\": \"2025-07-31\"}`
- **Description**: Sync all appointments in a date range
- **Response**: Sync results with counts

#### Remove Appointment Sync
- **Endpoint**: `DELETE /api/v1/calendar/unsync-appointment/{appointment_id}`
- **Description**: Remove appointment from Google Calendar sync
- **Response**: Success message

### Maintenance and Monitoring

#### Validate Integration
- **Endpoint**: `POST /api/v1/calendar/validate`
- **Description**: Comprehensive validation of calendar integration
- **Response**: Detailed validation results

#### Get Sync Status
- **Endpoint**: `GET /api/v1/calendar/sync-status`
- **Description**: Get sync status for user's appointments
- **Response**: Sync statistics and percentages

#### Check Conflicts
- **Endpoint**: `POST /api/v1/calendar/check-conflicts/{appointment_id}`
- **Description**: Check for calendar conflicts for an appointment
- **Response**: List of detected conflicts

#### Cleanup Orphaned Events
- **Endpoint**: `POST /api/v1/calendar/cleanup-orphaned`
- **Description**: Remove Google Calendar events with no corresponding V2 appointments
- **Response**: Cleanup results

## Usage Examples

### Frontend Integration

```javascript
// 1. Check if user has calendar connected
const checkCalendarStatus = async () => {
  const response = await fetch('/api/v1/calendar/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const status = await response.json();
  return status.connected;
};

// 2. Initiate calendar connection
const connectCalendar = async () => {
  const response = await fetch('/api/v1/calendar/auth', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  window.location.href = data.authorization_url;
};

// 3. Check availability before booking
const checkAvailability = async (startTime, endTime) => {
  const params = new URLSearchParams({
    start_time: startTime,
    end_time: endTime
  });
  
  const response = await fetch(`/api/v1/calendar/availability?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.available;
};

// 4. Get user's calendars and let them select one
const setupCalendar = async () => {
  // List calendars
  const response = await fetch('/api/v1/calendar/list', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { calendars } = await response.json();
  
  // Let user select a calendar
  const selectedCalendarId = await showCalendarSelector(calendars);
  
  // Set the selected calendar
  await fetch('/api/v1/calendar/select-calendar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ calendar_id: selectedCalendarId })
  });
};
```

### Backend Integration

```python
# Automatic sync hooks (integrate with your booking service)
from services.calendar_sync_service import CalendarSyncService

async def create_appointment(appointment_data, db: Session):
    # Create appointment in database
    appointment = Appointment(**appointment_data)
    db.add(appointment)
    db.commit()
    
    # Automatically sync to Google Calendar
    sync_service = CalendarSyncService(db)
    sync_service.sync_appointment_created(appointment)
    
    return appointment

async def update_appointment(appointment_id, update_data, db: Session):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    # Update appointment
    for key, value in update_data.items():
        setattr(appointment, key, value)
    db.commit()
    
    # Sync changes to Google Calendar
    sync_service = CalendarSyncService(db)
    sync_service.sync_appointment_updated(appointment)
    
    return appointment
```

## Timezone Handling

The integration properly handles timezones:

1. **User Timezone**: Stored in the user's profile (`user.timezone`)
2. **Calendar Timezone**: Each Google Calendar has its own timezone
3. **Conversion**: All times are converted appropriately for display and storage
4. **API Format**: Times are sent to Google Calendar API in RFC3339 format

### Example Timezone Usage

```python
from utils.timezone import get_user_timezone, format_datetime_for_google

# Get user's timezone
user_tz = get_user_timezone(user)  # e.g., "America/New_York"

# Format datetime for Google Calendar API
dt = datetime(2025, 7, 1, 10, 0)
google_format = format_datetime_for_google(dt, user_tz)
# Result: "2025-07-01T10:00:00-04:00"
```

## Error Handling

The integration includes comprehensive error handling:

1. **Network Errors**: Graceful handling of Google API timeouts
2. **Authentication Errors**: Clear messages for expired or invalid tokens
3. **Permission Errors**: Proper handling of insufficient calendar permissions
4. **Conflict Detection**: Identification and reporting of scheduling conflicts
5. **Validation**: Input validation for all API endpoints

### Common Error Scenarios

- **Expired Credentials**: Automatically refresh tokens when possible
- **API Rate Limits**: Respect Google Calendar API quotas and rate limits
- **Network Timeouts**: Retry logic for transient network issues
- **Permission Denied**: Clear error messages for insufficient permissions

## Security Considerations

1. **OAuth2 Security**: Secure token storage and refresh handling
2. **Scoped Permissions**: Request only necessary calendar permissions
3. **Token Encryption**: Calendar credentials are stored securely in the database
4. **HTTPS Requirements**: Production deployment requires HTTPS for OAuth2
5. **State Validation**: CSRF protection in OAuth2 flow

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
python test_google_calendar_integration.py
```

### Integration Tests

Run the simple integration test:

```bash
python test_calendar_integration_simple.py
```

### Manual Testing

1. **Connect Calendar**: Test the OAuth2 flow
2. **Create Appointment**: Verify sync to Google Calendar
3. **Check Conflicts**: Test availability checking
4. **Update Appointment**: Verify updates sync correctly
5. **Delete Appointment**: Verify removal from Google Calendar

## Monitoring and Maintenance

### Sync Status Monitoring

Monitor sync health with:

```python
sync_service = CalendarSyncService(db)
status = sync_service.get_sync_status_for_user(user)
print(f"Sync rate: {status['sync_percentage']}%")
```

### Bulk Operations

Perform bulk maintenance:

```python
# Sync all appointments for a date range
results = sync_service.bulk_sync_user_appointments(
    user, 
    start_date=datetime(2025, 7, 1),
    end_date=datetime(2025, 7, 31)
)

# Clean up orphaned events
cleanup_results = sync_service.cleanup_orphaned_events(user)
```

## Troubleshooting

### Common Issues

1. **"No valid credentials found"**
   - User needs to reconnect Google Calendar
   - Check OAuth2 credentials configuration

2. **"Calendar not connected"**
   - User hasn't completed OAuth2 flow
   - Check redirect URI configuration

3. **"Rate limit exceeded"**
   - Google Calendar API quota exceeded
   - Implement exponential backoff

4. **"Permission denied"**
   - Insufficient calendar permissions
   - Re-authorize with correct scopes

### Debugging

Enable debug logging:

```python
import logging
logging.getLogger('services.google_calendar_service').setLevel(logging.DEBUG)
```

Check sync status:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/calendar/sync-status
```

## Performance Considerations

1. **Caching**: Consider caching calendar data for frequently accessed information
2. **Batch Operations**: Use bulk sync for multiple appointments
3. **Rate Limiting**: Respect Google Calendar API rate limits
4. **Background Jobs**: Consider using background jobs for large sync operations

## Future Enhancements

Potential improvements for future versions:

1. **Webhook Support**: Real-time sync using Google Calendar webhooks
2. **Multiple Calendars**: Support for syncing to multiple calendars
3. **Custom Fields**: Map custom appointment fields to calendar events
4. **Recurring Events**: Enhanced support for recurring appointments
5. **Calendar Sharing**: Support for shared calendar access
6. **Mobile App Integration**: Direct calendar integration in mobile apps

## Support

For issues or questions about the Google Calendar integration:

1. Check the logs for detailed error messages
2. Use the validation endpoint to diagnose connection issues
3. Verify Google Cloud Console configuration
4. Test with the provided test scripts

The integration is designed to be robust and handle edge cases gracefully, providing a seamless experience for both barbers and clients.