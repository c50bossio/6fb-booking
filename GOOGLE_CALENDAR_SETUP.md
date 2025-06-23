# Google Calendar Integration Setup Guide

## Overview

The 6FB Booking Platform now includes comprehensive Google Calendar integration that allows barbers to sync their appointments with their Google Calendar. This two-way sync keeps both systems in sync automatically.

## Features

- **OAuth 2.0 Authentication**: Secure connection to Google Calendar
- **Automatic Sync**: Real-time syncing when appointments are created/updated/deleted
- **Manual Sync**: Bulk sync option for existing appointments
- **Customizable Settings**: Control what information is synced
- **Event Management**: Create, update, and delete calendar events
- **Privacy Controls**: Configure event visibility and information sharing
- **Multiple Calendars**: Support for different calendar selections
- **Timezone Support**: Proper timezone handling for events
- **Error Tracking**: Comprehensive logging and error handling

## Setup Instructions

### 1. Google Cloud Console Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note the project ID

2. **Enable Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as application type
   - Set the name (e.g., "6FB Booking Platform")
   - Add authorized redirect URIs:
     - For development: `http://localhost:8000/api/v1/google-calendar/oauth/callback`
     - For production: `https://yourdomain.com/api/v1/google-calendar/oauth/callback`
   - Note the Client ID and Client Secret

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless you have Google Workspace)
   - Fill in required fields:
     - App name: "6FB Booking Platform"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
   - Add test users (for development)

### 2. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Google Calendar Integration
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/google-calendar/oauth/callback

# For production, use your actual domain:
# GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/v1/google-calendar/oauth/callback
```

### 3. Backend Dependencies

Ensure the following Python packages are installed:

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

Or add to your `requirements.txt`:

```txt
google-auth>=2.0.0
google-auth-oauthlib>=1.0.0
google-auth-httplib2>=0.1.0
google-api-python-client>=2.0.0
```

### 4. Database Migration

The Google Calendar integration requires additional database tables. Run the migration:

```bash
cd backend
python -c "
from config.database import engine
from models.google_calendar_settings import GoogleCalendarSettings, GoogleCalendarSyncLog
from models.base import BaseModel

# Create tables
BaseModel.metadata.create_all(bind=engine, tables=[
    GoogleCalendarSettings.__table__,
    GoogleCalendarSyncLog.__table__
])
print('Google Calendar tables created successfully')
"
```

### 5. Frontend Dependencies

The frontend integration uses existing components and hooks. No additional packages are required.

## Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GOOGLE_CALENDAR_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | Yes | - |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | Yes | - |
| `GOOGLE_CALENDAR_REDIRECT_URI` | OAuth callback URL (must match Google Cloud Console) | No | `http://localhost:8000/api/v1/google-calendar/oauth/callback` |

### Sync Settings

Users can configure the following sync preferences:

#### Automatic Sync Options
- **Auto sync enabled**: Enable/disable automatic syncing
- **Sync on create**: Sync when new appointments are created
- **Sync on update**: Sync when appointments are modified
- **Sync on delete**: Remove events when appointments are deleted

#### What to Sync
- **All appointments**: Sync every appointment
- **Only confirmed**: Sync only confirmed appointments
- **Only paid**: Sync only paid appointments

#### Event Information
- **Show client name**: Include client name in event title
- **Show service details**: Include service information
- **Include client email**: Add client as attendee
- **Include client phone**: Add phone to event description
- **Include service price**: Add pricing information
- **Include notes**: Add appointment notes

#### Reminders
- **Enable reminders**: Turn on/off event reminders
- **Email reminder**: 1 day, 12 hours, 8 hours, 4 hours, 2 hours, or 1 hour before
- **Popup reminder**: 30, 15, 10, or 5 minutes before

#### Privacy & Display
- **Event visibility**: Private, Public, or Default
- **Timezone**: Support for all US timezones

## API Endpoints

### Authentication
- `GET /api/v1/google-calendar/connect` - Get OAuth authorization URL
- `GET /api/v1/google-calendar/oauth/callback` - Handle OAuth callback
- `DELETE /api/v1/google-calendar/disconnect` - Disconnect Google Calendar

### Status & Settings
- `GET /api/v1/google-calendar/status` - Get connection status
- `GET /api/v1/google-calendar/settings` - Get sync settings
- `PUT /api/v1/google-calendar/settings` - Update sync settings

### Sync Operations
- `POST /api/v1/google-calendar/sync` - Manual sync all appointments
- `GET /api/v1/google-calendar/events` - Get calendar events for date range
- `GET /api/v1/google-calendar/sync-logs` - Get sync operation logs

## Frontend Components

### Settings Page Integration

Add the Google Calendar settings to your settings page:

```tsx
import GoogleCalendarSettings from '@/components/settings/GoogleCalendarSettings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Other settings */}
      <GoogleCalendarSettings />
    </div>
  );
}
```

### Appointment Modal Integration

Add sync status to appointment modals:

```tsx
import GoogleCalendarSync from '@/components/calendar/GoogleCalendarSync';

export default function AppointmentModal({ appointment }) {
  return (
    <div>
      {/* Appointment details */}
      <GoogleCalendarSync
        appointmentId={appointment.id}
        googleEventId={appointment.google_calendar_event_id}
        showStatus={true}
        showBadge={true}
      />
    </div>
  );
}
```

### Quick Status Display

Show connection status in dashboard:

```tsx
import { QuickSyncStatus } from '@/components/calendar/GoogleCalendarSync';

export default function Dashboard() {
  return (
    <div>
      <QuickSyncStatus />
      {/* Dashboard content */}
    </div>
  );
}
```

## Security Considerations

### OAuth 2.0 Best Practices
- Store credentials securely using pickle encryption
- Implement proper token refresh handling
- Use HTTPS in production
- Validate OAuth state parameters

### Data Privacy
- Only sync necessary appointment information
- Respect user privacy settings
- Implement proper error handling
- Log sync operations for audit trails

### Access Control
- Ensure barbers can only access their own calendar integration
- Validate appointment ownership before syncing
- Implement rate limiting for API calls

## Testing

### Unit Tests

Test the Google Calendar service:

```python
# backend/tests/test_google_calendar_service.py
import pytest
from services.google_calendar_service import GoogleCalendarService
from models.appointment import Appointment

def test_google_calendar_service():
    service = GoogleCalendarService()
    # Add your tests here
```

### Integration Tests

Test the API endpoints:

```python
# backend/tests/test_google_calendar_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_calendar_status_endpoint():
    response = client.get("/api/v1/google-calendar/status")
    # Add assertions
```

### Frontend Tests

Test the React components:

```tsx
// frontend/src/components/settings/__tests__/GoogleCalendarSettings.test.tsx
import { render, screen } from '@testing-library/react';
import GoogleCalendarSettings from '../GoogleCalendarSettings';

test('renders Google Calendar settings', () => {
  render(<GoogleCalendarSettings />);
  expect(screen.getByText('Google Calendar Connection')).toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

1. **OAuth Error: redirect_uri_mismatch**
   - Ensure the redirect URI in Google Cloud Console matches exactly
   - Check for http vs https mismatch
   - Verify trailing slashes

2. **Authentication Failed**
   - Check client ID and secret are correct
   - Ensure Google Calendar API is enabled
   - Verify OAuth consent screen is properly configured

3. **Sync Failures**
   - Check network connectivity
   - Verify appointment data is complete
   - Review sync logs for specific errors

4. **Calendar Events Not Appearing**
   - Check timezone settings
   - Verify calendar permissions
   - Ensure events are created in the correct calendar

### Debug Mode

Enable debug logging for detailed information:

```python
import logging
logging.getLogger('services.google_calendar_service').setLevel(logging.DEBUG)
```

### Support

For additional support:
1. Check the sync logs in the admin interface
2. Review server logs for error details
3. Test with a simple calendar event first
4. Verify OAuth flow works with Google's OAuth Playground

## Production Deployment

### Pre-deployment Checklist
- [ ] Google Cloud Console configured for production domain
- [ ] Environment variables set with production values
- [ ] OAuth consent screen published (if needed)
- [ ] SSL certificate configured
- [ ] Database migrations applied
- [ ] Error monitoring configured

### Monitoring
- Monitor sync success rates
- Track API rate limits
- Alert on authentication failures
- Log sync performance metrics

### Backup & Recovery
- Backup Google Calendar credentials securely
- Document recovery procedures
- Test disaster recovery scenarios

This comprehensive integration provides seamless two-way synchronization between the 6FB Booking Platform and Google Calendar, enhancing the user experience while maintaining security and reliability.
