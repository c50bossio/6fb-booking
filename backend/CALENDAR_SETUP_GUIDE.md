# 6FB Calendar System Setup Guide

## Overview

The 6FB Booking Platform now includes a comprehensive calendar system with Google Calendar integration, real-time updates, and advanced booking functionality.

## Features

### ✅ **Implemented Features**

1. **Calendar API Endpoints**
   - `/api/v1/calendar/events` - Get calendar events for date range
   - `/api/v1/calendar/availability/{barber_id}` - Get available time slots
   - `/api/v1/calendar/appointments` - Create/update/delete appointments
   - `/api/v1/calendar/stats` - Get calendar statistics

2. **Google Calendar Integration**
   - OAuth authentication flow
   - Automatic appointment synchronization
   - Bi-directional sync support
   - Event management (create, update, delete)

3. **Frontend Components**
   - Modern calendar interface (`ModernCalendar.tsx`)
   - Calendar system component (`CalendarSystem.tsx`)
   - Appointment creation/editing modals
   - Real-time WebSocket updates

4. **Booking Management**
   - Time slot availability checking
   - Conflict detection
   - Automated email notifications
   - Payment integration

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

#### Database Migration
```bash
# Apply the Google Calendar migration
alembic upgrade add_google_calendar_event_id
```

#### Environment Configuration
Add to your `.env` file:
```bash
# Google Calendar Integration (Optional)
GOOGLE_CALENDAR_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/calendar/oauth/callback
```

### 2. Google Calendar API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Calendar API**
   - Navigate to APIs & Services > Library
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/v1/calendar/oauth/callback`
     - `https://yourdomain.com/api/v1/calendar/oauth/callback` (for production)

4. **Configure OAuth Consent Screen**
   - Go to APIs & Services > OAuth consent screen
   - Fill in required information
   - Add scopes: `https://www.googleapis.com/auth/calendar`

### 3. Frontend Setup

The frontend components are already configured and ready to use:

```bash
cd frontend
npm install  # Install any missing dependencies
npm run dev  # Start development server
```

### 4. Testing the Setup

#### Run Backend Tests
```bash
cd backend
python test_calendar_functionality.py
```

#### Start the Application
```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

#### Access the Calendar
- Open browser to `http://localhost:3000/dashboard/calendar`
- Test appointment creation and management
- Connect Google Calendar via the settings panel

## API Documentation

### Calendar Events
```typescript
GET /api/v1/calendar/events
Query Parameters:
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
- barber_ids: comma-separated IDs
- location_ids: comma-separated IDs
- statuses: comma-separated statuses
- include_google_calendar: boolean
```

### Availability
```typescript
GET /api/v1/calendar/availability/{barber_id}
Query Parameters:
- date: YYYY-MM-DD
- service_id: number (optional)
- duration: number (optional, minutes)
```

### Appointments
```typescript
POST /api/v1/calendar/appointments
Body: {
  barber_id: number
  client_name: string
  client_email?: string
  client_phone?: string
  appointment_date: YYYY-MM-DD
  appointment_time: HH:MM
  service_name: string
  service_duration: number
  service_price: number
  notes?: string
  sync_to_google_calendar?: boolean
}
```

### Google Calendar OAuth
```typescript
GET /api/v1/calendar/oauth/connect     # Start OAuth flow
GET /api/v1/calendar/oauth/callback    # OAuth callback
GET /api/v1/calendar/oauth/status      # Connection status
POST /api/v1/calendar/oauth/disconnect # Disconnect
```

## Frontend Usage

### Calendar Component
```typescript
import { CalendarSystem } from '@/components/calendar'

<CalendarSystem
  initialView="week"
  locationId={1}
  enableDragDrop={true}
  onAppointmentCreate={(appointment) => {
    console.log('New appointment:', appointment)
  }}
/>
```

### API Service
```typescript
import { calendarService } from '@/lib/api/calendar'

// Get calendar events
const events = await calendarService.getCalendarEvents(
  startDate,
  endDate,
  { barberIds: [1, 2] }
)

// Create appointment
const appointment = await calendarService.createAppointment({
  barberId: 1,
  clientName: "John Doe",
  appointmentDate: "2024-06-22",
  appointmentTime: "14:00",
  serviceName: "Haircut",
  duration: 60,
  price: 45
})
```

## Advanced Features

### Real-time Updates
The calendar supports real-time updates via WebSocket:
- Automatic refresh when appointments are created/updated
- Multi-user collaboration support
- Connection status monitoring

### Google Calendar Sync
- Automatic bi-directional synchronization
- Conflict detection and resolution
- Bulk operations support
- Event metadata preservation

### Booking Rules
- Configurable availability windows
- Service-specific restrictions
- Location-based policies
- Automated conflict checking

## Troubleshooting

### Common Issues

1. **Google Calendar Not Connecting**
   - Check OAuth credentials in environment
   - Verify redirect URI matches exactly
   - Ensure Calendar API is enabled

2. **Appointments Not Syncing**
   - Check barber has connected Google Calendar
   - Verify appointment has `sync_to_google_calendar: true`
   - Check logs for sync errors

3. **Frontend Not Loading Events**
   - Check API endpoints are accessible
   - Verify authentication tokens
   - Check browser console for errors

### Debug Commands
```bash
# Test API connectivity
curl http://localhost:8000/health

# Test calendar endpoints (with auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/calendar/events?start_date=2024-06-01&end_date=2024-06-30"

# Check Google Calendar service
python -c "from services.google_calendar_service import google_calendar_service; print(google_calendar_service.get_connection_status(1))"
```

## Security Considerations

1. **Google Calendar Credentials**
   - Store securely in environment variables
   - Use different credentials for dev/prod
   - Regularly rotate client secrets

2. **Authentication**
   - All calendar endpoints require authentication
   - Role-based access control implemented
   - OAuth state parameter validation

3. **Data Privacy**
   - Google Calendar events contain limited data
   - Client information handled according to privacy policy
   - Audit logging for all calendar operations

## Performance Optimization

1. **Caching**
   - Calendar events cached for 5 minutes
   - Availability data cached for 2 minutes
   - WebSocket for real-time invalidation

2. **Database Optimization**
   - Indexed date and barber_id columns
   - Eager loading for related data
   - Optimized queries for date ranges

3. **API Rate Limiting**
   - Google Calendar API quota management
   - Request batching for bulk operations
   - Exponential backoff for retries

## Monitoring and Analytics

### Key Metrics
- Appointment creation/cancellation rates
- Google Calendar sync success rate
- API response times
- User engagement with calendar features

### Logging
- All calendar operations logged
- Google Calendar sync status tracked
- Error tracking with Sentry integration

## Future Enhancements

### Planned Features
- [ ] Recurring appointments
- [ ] Multi-location calendar views
- [ ] Advanced availability rules
- [ ] Mobile calendar app
- [ ] Calendar sharing features
- [ ] Integration with other calendar systems (Outlook, Apple)

### Integration Opportunities
- [ ] SMS reminders
- [ ] Video call scheduling
- [ ] Payment processing integration
- [ ] Customer feedback collection
- [ ] Automated marketing campaigns

## Support

For technical support or feature requests:
1. Check this documentation
2. Review the API documentation at `/docs`
3. Check the troubleshooting section
4. Contact the development team

---

**Note**: This calendar system is designed to be production-ready but should be thoroughly tested in your specific environment before deployment.
