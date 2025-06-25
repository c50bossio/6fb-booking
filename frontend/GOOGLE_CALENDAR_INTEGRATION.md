# Google Calendar Integration Guide

This guide explains how to set up and use the Google Calendar integration in the 6FB Booking platform.

## Overview

The Google Calendar integration provides seamless two-way synchronization between your booking platform and Google Calendar, enabling:

- **Two-way Sync**: Appointments sync automatically between platforms
- **Real-time Updates**: Changes reflect immediately in both calendars
- **Conflict Resolution**: Smart handling of scheduling conflicts
- **Multi-calendar Support**: Sync with multiple Google Calendars
- **Offline Queue**: Sync operations queue when offline
- **OAuth 2.0 Security**: Secure authentication with minimal permissions

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen:
   - Choose "External" for user type
   - Fill in required app information
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
4. Create OAuth client ID:
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)
5. Save the Client ID and Client Secret

### 3. Environment Configuration

Add these variables to your `.env.local` file:

```env
# Google Calendar API Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_CLIENT_SECRET=your_client_secret_here

# App URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. API Key Setup (Optional)

For enhanced functionality, create an API key:
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. Restrict the API key to Google Calendar API
4. Add to `NEXT_PUBLIC_GOOGLE_API_KEY`

## Usage

### Basic Integration

```tsx
import RobustCalendar from '@/components/calendar/RobustCalendar'

function MyCalendarPage() {
  return (
    <RobustCalendar
      appointments={appointments}
      enableGoogleSync={true}
      onAppointmentClick={handleAppointmentClick}
      onCreateAppointment={handleCreateAppointment}
    />
  )
}
```

### Advanced Configuration

```tsx
import { GoogleCalendarProvider } from '@/contexts/GoogleCalendarContext'

function App() {
  return (
    <GoogleCalendarProvider
      onGoogleEventCreated={handleGoogleEventCreated}
      onGoogleEventUpdated={handleGoogleEventUpdated}
      onGoogleEventDeleted={handleGoogleEventDeleted}
    >
      <RobustCalendar
        enableGoogleSync={true}
        // ... other props
      />
    </GoogleCalendarProvider>
  )
}
```

## Features

### Authentication Flow

1. User clicks "Connect" in the Google Calendar panel
2. Redirected to Google OAuth consent screen
3. User grants calendar permissions
4. Redirected back with auth code
5. Tokens exchanged and stored securely
6. Calendar list fetched and displayed

### Sync Configuration

- **Sync Direction**: Choose between:
  - Two-way sync (default)
  - To Google only
  - From Google only
- **Auto Sync**: Set intervals from 5 minutes to hourly
- **Calendar Selection**: Enable/disable specific calendars
- **Manual Sync**: Trigger sync on-demand

### Conflict Resolution

The system handles conflicts using configurable strategies:

1. **Local Priority**: Local changes override Google
2. **Google Priority**: Google changes override local
3. **Newest Wins**: Most recent update wins
4. **Manual**: Queue conflicts for user resolution

### Data Mapping

Appointments sync with the following mapping:

| App Field | Google Calendar Field |
|-----------|---------------------|
| title | summary |
| date + startTime | start.dateTime |
| date + endTime | end.dateTime |
| status | status |
| notes | description |
| client email | attendees |
| appointment ID | extendedProperties.private.appointmentId |

## API Reference

### GoogleCalendarClient

```typescript
// Initialize client
const client = new GoogleCalendarClient()

// Auth methods
await client.authenticate()
await client.handleAuthCallback(code)
await client.refreshAccessToken()
await client.signOut()

// Calendar methods
const calendars = await client.listCalendars()
const calendar = await client.getCalendar(calendarId)

// Event methods
const events = await client.listEvents(calendarId, params)
const event = await client.getEvent(calendarId, eventId)
await client.createEvent(calendarId, event)
await client.updateEvent(calendarId, eventId, event)
await client.deleteEvent(calendarId, eventId)
```

### GoogleCalendarSyncService

```typescript
// Initialize sync service
const sync = new GoogleCalendarSyncService()

// Sync operations
await sync.startAutoSync(intervalMinutes)
sync.stopAutoSync()
await sync.syncAll(calendarIds, appointments)

// Event operations
await sync.createGoogleEvent(appointment, calendarId)
await sync.updateGoogleEvent(eventId, appointment, calendarId)
await sync.deleteGoogleEvent(eventId, calendarId)

// Status
const status = sync.getSyncStatus()
const conflicts = sync.getConflicts()
```

### React Hooks

```typescript
// Use Google Calendar context
const {
  authState,
  syncState,
  signIn,
  signOut,
  syncNow,
  startAutoSync,
  stopAutoSync,
  getCalendars,
  enableCalendarSync,
  disableCalendarSync,
  resolveConflict
} = useGoogleCalendar()
```

## Security Considerations

1. **OAuth Scopes**: Only calendar permissions requested
2. **Token Storage**: Encrypted in localStorage
3. **Token Refresh**: Automatic refresh before expiry
4. **HTTPS Required**: OAuth only works over HTTPS in production
5. **Rate Limiting**: Built-in rate limiting to prevent quota issues

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure redirect URI in Google Console matches exactly
   - Include protocol (http/https) and port

2. **"Rate limit exceeded"**
   - Reduce sync frequency
   - Check quota in Google Cloud Console

3. **"Token expired"**
   - Tokens auto-refresh, but user may need to re-authenticate
   - Check refresh token is stored properly

4. **Sync not working**
   - Verify calendar is enabled for sync
   - Check browser console for errors
   - Ensure offline queue isn't full

### Debug Mode

Enable debug logging:

```typescript
// In your component
const { syncState } = useGoogleCalendar()
console.log('Sync State:', syncState)
```

## Best Practices

1. **Sync Frequency**: Balance between real-time updates and API quota
2. **Conflict Resolution**: Choose strategy based on business needs
3. **Error Handling**: Implement retry logic for transient failures
4. **User Feedback**: Show sync status and progress indicators
5. **Data Privacy**: Only sync necessary appointment data

## Demo

Visit `/calendar-google-demo` to see the integration in action with:
- Live authentication flow
- Real-time sync demonstration
- Conflict resolution examples
- Multi-calendar management

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Verify environment variables are set correctly
3. Ensure Google Calendar API is enabled
4. Check API quotas in Google Cloud Console
