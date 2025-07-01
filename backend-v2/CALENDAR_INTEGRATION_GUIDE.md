# Calendar Integration Guide

This guide covers the comprehensive Google Calendar integration implementation for the 6FB Booking platform.

## Overview

The calendar integration provides seamless two-way synchronization between the booking system and Google Calendar, preventing double-booking and keeping barbers organized.

## Features

### 1. **OAuth 2.0 Authentication**
- Secure Google Calendar connection
- Token refresh handling
- Multiple calendar support

### 2. **Two-Way Synchronization**
- Automatic appointment sync to Google Calendar
- Real-time availability checking
- Conflict detection and resolution

### 3. **Enhanced Calendar Views**
- Month, week, and day views
- Drag-and-drop rescheduling
- Color coding by service/status
- Google Calendar event overlay

### 4. **Booking Integration**
- Real-time availability checks during booking
- Google Calendar busy time visualization
- Prevention of double-booking

## Components

### CalendarSettings Page (`/app/settings/calendar/page.tsx`)
Main settings page for managing Google Calendar connection:
- OAuth flow initiation
- Calendar selection
- Sync preferences configuration
- Connection status display

### CalendarSync Component (`/components/CalendarSync.tsx`)
Manages synchronization between systems:
- Sync status overview
- Manual sync triggers
- Date range selection
- Sync history and logs
- Orphaned event cleanup

### EnhancedCalendarView Component (`/components/EnhancedCalendarView.tsx`)
Full-featured calendar interface:
- Multiple view types (month/week/day)
- Drag-and-drop appointment rescheduling
- Quick appointment creation
- Google Calendar event overlay
- Keyboard navigation support

### BookingCalendarWithGoogleSync Component (`/components/BookingCalendarWithGoogleSync.tsx`)
Enhanced booking calendar:
- Google Calendar busy time visualization
- Real-time availability checking
- Conflict warnings
- Responsive design

### CalendarConflictResolver Component (`/components/CalendarConflictResolver.tsx`)
Manages conflicts between calendars:
- Visual conflict comparison
- Priority rules configuration
- Bulk conflict resolution
- Automated conflict handling

## API Integration

### Calendar API Endpoints
```typescript
// Authentication
POST   /api/calendar/auth                 - Initiate OAuth flow
GET    /api/calendar/callback            - OAuth callback handler
DELETE /api/calendar/disconnect          - Disconnect integration

// Status and Management
GET    /api/calendar/status              - Check connection status
GET    /api/calendar/list                - List available calendars
POST   /api/calendar/select-calendar     - Select calendar for sync

// Availability
GET    /api/calendar/availability        - Check time slot availability
GET    /api/calendar/free-busy           - Get free/busy times

// Synchronization
POST   /api/calendar/sync-appointment/{id}  - Sync single appointment
POST   /api/calendar/bulk-sync             - Bulk sync appointments
GET    /api/calendar/sync-status           - Get sync status

// Conflict Management
POST   /api/calendar/check-conflicts/{id}  - Check for conflicts
POST   /api/calendar/cleanup-orphaned      - Clean orphaned events
```

## Usage Examples

### Setting Up Calendar Integration

1. **Navigate to Calendar Settings**
   ```
   /settings/calendar
   ```

2. **Connect Google Calendar**
   - Click "Connect Google Calendar"
   - Authorize access in Google OAuth flow
   - Select calendar for synchronization

3. **Configure Sync Preferences**
   - Auto-sync new appointments
   - Sync cancellations
   - Include client details
   - Block busy times

### Using the Enhanced Calendar View

```tsx
import EnhancedCalendarView from '@/components/EnhancedCalendarView'

// In your component
<EnhancedCalendarView />
```

### Implementing Booking with Google Sync

```tsx
import BookingCalendarWithGoogleSync from '@/components/BookingCalendarWithGoogleSync'

function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  return (
    <BookingCalendarWithGoogleSync
      selectedDate={selectedDate}
      onDateSelect={setSelectedDate}
      checkGoogleCalendar={true}
      barberId={1} // Optional: specific barber
    />
  )
}
```

### Resolving Calendar Conflicts

```tsx
import CalendarConflictResolver from '@/components/CalendarConflictResolver'

// Add to your dashboard or admin panel
<CalendarConflictResolver />
```

## Configuration

### Environment Variables
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar
```

### Priority Rules
Default priority rules for conflict resolution:
1. Confirmed appointments take priority
2. Google Calendar blocks are respected
3. Manual review for complex conflicts

## Best Practices

1. **Regular Sync Checks**
   - Monitor sync status dashboard
   - Address conflicts promptly
   - Clean up orphaned events periodically

2. **User Experience**
   - Show loading states during sync operations
   - Provide clear conflict explanations
   - Enable manual override options

3. **Performance**
   - Use date range limits for bulk operations
   - Cache calendar data when appropriate
   - Implement pagination for large datasets

4. **Security**
   - Store credentials securely
   - Refresh tokens automatically
   - Validate all calendar operations

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check Google OAuth credentials
   - Verify redirect URI matches configuration
   - Ensure required scopes are granted

2. **Sync Not Working**
   - Check calendar selection
   - Verify sync preferences
   - Review error logs

3. **Conflicts Not Resolving**
   - Check priority rules configuration
   - Ensure both calendars are accessible
   - Manually resolve complex conflicts

### Debug Tools
- Calendar validation endpoint: `/api/calendar/validate`
- Sync status monitoring: `/api/calendar/sync-status`
- Conflict checker: `/api/calendar/check-conflicts/{appointment_id}`

## Future Enhancements

1. **Multi-Calendar Support**
   - Sync with multiple Google Calendars
   - Calendar-specific rules

2. **Advanced Scheduling**
   - Buffer time management
   - Travel time calculation
   - Resource booking

3. **Automation**
   - Automated conflict resolution
   - Smart rescheduling suggestions
   - Predictive availability

## Demo

Visit `/calendar-demo` to see all calendar integration features in action.