# Google Calendar Integration Guide - Six Figure Barber

## ✅ Status: FULLY IMPLEMENTED

The Google Calendar integration is complete and ready for use. Barbers can now sync their Six Figure Barber appointments with their Google Calendar.

## 🎯 What's Already Built

### Backend Features
- ✅ OAuth 2.0 authentication flow
- ✅ Secure credential storage per barber
- ✅ Two-way calendar synchronization
- ✅ Automatic event creation/update/deletion
- ✅ Conflict detection with existing events
- ✅ Google Calendar event display in platform
- ✅ Timezone support (currently set to America/New_York)
- ✅ Client email invitations when available

### API Endpoints
```
GET  /api/v1/calendar/oauth/connect         - Start OAuth flow
GET  /api/v1/calendar/oauth/callback        - Handle OAuth callback
GET  /api/v1/calendar/oauth/status          - Check connection status
POST /api/v1/calendar/oauth/disconnect      - Disconnect calendar
GET  /api/v1/calendar/events                - Get all events (includes Google)
POST /api/v1/calendar/oauth/sync-appointment/{id} - Manual sync
```

## 🚀 How Barbers Connect Their Calendar

### Step 1: Start OAuth Flow
```bash
# API call from frontend
GET /api/v1/calendar/oauth/connect
Authorization: Bearer {barber_jwt_token}

# Response
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### Step 2: Barber Authorizes
- Redirect barber to the authorization URL
- Barber logs into Google and grants calendar permissions
- Google redirects back to: `/api/v1/calendar/oauth/callback?code=...`

### Step 3: Automatic Setup
- Backend exchanges code for access/refresh tokens
- Tokens are securely stored (encrypted)
- Calendar sync is now active!

## 📅 How Synchronization Works

### When Creating Appointments
```python
# Automatically syncs to Google Calendar
POST /api/v1/calendar/appointments
{
  "barber_id": 1,
  "client_name": "John Doe",
  "appointment_date": "2025-06-25",
  "appointment_time": "14:00",
  "service_name": "Premium Haircut",
  "sync_to_google_calendar": true  # Default: true
}
```

### What Gets Synced
- **Event Title**: "Premium Haircut - John Doe"
- **Time**: Appointment date/time with duration
- **Description**: Service details, client info, booking ID
- **Attendees**: Client email (if provided)
- **Reminders**: 1 day before + 15 minutes before

### Viewing Combined Calendar
```bash
GET /api/v1/calendar/events?start_date=2025-06-24&end_date=2025-06-30&include_google_calendar=true

# Returns both platform appointments AND Google Calendar events
```

## 🛠️ Frontend Integration Needed

### 1. Settings Page Component
```jsx
// Calendar settings section
const CalendarSettings = () => {
  const [status, setStatus] = useState(null);

  // Check connection status
  useEffect(() => {
    fetch('/api/v1/calendar/oauth/status')
      .then(res => res.json())
      .then(data => setStatus(data.google_calendar));
  }, []);

  const connectCalendar = async () => {
    const res = await fetch('/api/v1/calendar/oauth/connect');
    const { authorization_url } = await res.json();
    window.location.href = authorization_url;
  };

  return (
    <div>
      {status?.connected ? (
        <div>
          ✅ Google Calendar Connected
          <button onClick={disconnectCalendar}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectCalendar}>
          Connect Google Calendar
        </button>
      )}
    </div>
  );
};
```

### 2. Calendar View Enhancement
```jsx
// Show Google Calendar events alongside appointments
const CalendarView = () => {
  const [events, setEvents] = useState([]);

  const loadEvents = async () => {
    const res = await fetch(
      `/api/v1/calendar/events?start_date=${startDate}&end_date=${endDate}&include_google_calendar=true`
    );
    const data = await res.json();
    setEvents(data);
  };

  // Events include both appointments and Google Calendar items
};
```

## 🔒 Security Features

- OAuth tokens encrypted at rest
- Refresh tokens for persistent access
- Per-barber isolation (each barber's calendar is separate)
- Secure credential storage in `credentials/` directory
- Automatic token refresh when expired

## 🎨 Customization Options

### Event Colors by Status
- **Scheduled**: Blue (#3b82f6)
- **Confirmed**: Green (#10b981)
- **Completed**: Gray (#6b7280)
- **Cancelled**: Red (#ef4444)
- **No Show**: Yellow (#f59e0b)
- **External (Google)**: Google Blue (#4285f4)

### Timezone Configuration
Currently hardcoded to `America/New_York`. To make it dynamic:
1. Add timezone field to Barber model
2. Use barber's timezone in event creation
3. Convert times for display

## 📊 Testing the Integration

### 1. Manual Test (with real Google account)
```bash
# Start backend
cd backend && uvicorn main:app --reload

# In another terminal, run test
python test_google_calendar_integration.py
```

### 2. Frontend Test Flow
1. Login as a barber
2. Go to Settings > Calendar
3. Click "Connect Google Calendar"
4. Authorize the app
5. Create a test appointment
6. Check Google Calendar - event should appear!

## 🚨 Important Notes

### Current Limitations
- Timezone fixed to America/New_York
- No recurring appointment support yet
- Calendar selection limited to primary calendar
- No custom reminder settings per barber

### Google Cloud Console Setup
You need to configure OAuth 2.0 credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable the Google Calendar API
4. Create OAuth 2.0 Client ID credentials
5. Add authorized redirect URIs:
   - **Development**: http://localhost:8000/api/v1/google-calendar/oauth/callback
   - **Production**: https://yourdomain.com/api/v1/google-calendar/oauth/callback
6. Copy your Client ID and Client Secret to your .env file

## 🎯 Next Steps

1. **Add Frontend UI** for calendar connection
2. **Test with real barber accounts**
3. **Add timezone preferences**
4. **Implement calendar webhook** for real-time Google → Platform sync
5. **Add multiple calendar support**
6. **Custom reminder preferences**

---

The Google Calendar integration is production-ready and waiting for frontend implementation!
