# Google Calendar Integration - Complete Setup Guide

## 🎯 Overview

The Google Calendar integration for the 6FB Booking Platform is **fully implemented** and ready for production use. This guide will walk you through the final setup steps to activate the integration.

## ✅ Implementation Status

### ✅ **Backend Implementation (100% Complete)**
- OAuth 2.0 authentication flow
- Full Google Calendar API integration 
- Database schema with sync tracking
- Comprehensive API endpoints
- Error handling and retry logic
- Security and credential management

### ✅ **Frontend Implementation (100% Complete)**
- Google Calendar settings component
- OAuth flow handling
- Real-time sync status display
- Comprehensive settings management
- User-friendly interface

### 🔧 **Setup Required (To Complete)**
- Google Cloud Console configuration
- Environment variable setup
- Testing and validation

## 🚀 Quick Start

### Step 1: Google Cloud Console Setup (5 minutes)

1. **Go to Google Cloud Console**
   - Visit: [https://console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing project

2. **Enable Google Calendar API**
   ```bash
   # In Google Cloud Console:
   # 1. Go to "APIs & Services" > "Library"
   # 2. Search for "Google Calendar API"
   # 3. Click "Enable"
   ```

3. **Create OAuth 2.0 Credentials**
   ```bash
   # In Google Cloud Console:
   # 1. Go to "APIs & Services" > "Credentials"
   # 2. Click "Create Credentials" > "OAuth 2.0 Client ID"
   # 3. Choose "Web application"
   # 4. Add authorized redirect URIs:
   ```
   
   **Development:**
   ```
   http://localhost:8000/api/v1/google-calendar/oauth/callback
   ```
   
   **Production (replace with your domain):**
   ```
   https://yourdomain.com/api/v1/google-calendar/oauth/callback
   ```

4. **Configure OAuth Consent Screen**
   - App name: "6FB Calendar Sync"
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar`

### Step 2: Environment Configuration (2 minutes)

Add these variables to your `.env` file:

```bash
# Google Calendar Integration
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_from_google_cloud
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_from_google_cloud
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/v1/google-calendar/oauth/callback

# Optional: Feature flag (already enabled by default)
FEATURE_GOOGLE_CALENDAR_SYNC=true
```

### Step 3: Test the Integration (3 minutes)

1. **Start the backend server:**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Run the test script:**
   ```bash
   cd backend
   python test_google_calendar_integration.py
   ```

3. **Test the OAuth flow:**
   - Navigate to: `http://localhost:3000/settings/google-calendar`
   - Click "Connect Google Calendar"
   - Complete the OAuth authorization
   - Verify connection status shows "Connected"

## 📱 User Experience

### For Barbers

1. **Initial Setup (One-time)**
   - Go to Settings > Calendar Integration
   - Click "Connect Google Calendar"
   - Authorize with Google account
   - Configure sync preferences

2. **Daily Usage**
   - Create appointments in 6FB platform
   - Appointments automatically appear in Google Calendar
   - Receive calendar reminders as configured
   - View appointments in Google Calendar apps

### Sync Features

- **Automatic Sync**: Real-time sync when appointments are created/updated/deleted
- **Sync Filters**: All appointments, confirmed only, or paid only
- **Event Details**: Client name, service info, pricing (configurable)
- **Reminders**: Email and popup reminders with custom timing
- **Privacy**: Configurable event visibility and information sharing

## 🛠️ Advanced Configuration

### Customizing Event Format

Events are automatically formatted as:
```
Title: [Service Name] - [Client Name]
Time: [Appointment Date/Time] with duration
Description: Service details, client info, booking ID
Attendees: Client email (if available)
Reminders: Configurable (default: 1 day + 15 minutes before)
```

### Sync Settings Options

- **Auto-sync toggle**: Enable/disable automatic synchronization
- **Event triggers**: Sync on create, update, delete
- **Content filters**: All appointments, confirmed only, paid only
- **Information control**: Client details, pricing, notes, service info
- **Privacy settings**: Event visibility and data sharing controls
- **Reminders**: Email (1 hour to 1 day) and popup (5 to 30 minutes)

### Timezone Support

Currently supports major US timezones:
- Eastern Time (ET)
- Central Time (CT) 
- Mountain Time (MT)
- Pacific Time (PT)
- Arizona Time (MST)
- Alaska Time (AKST)
- Hawaii Time (HST)

## 🔒 Security Features

- **OAuth 2.0**: Industry-standard authentication
- **Encrypted Storage**: Secure credential storage
- **Per-Barber Isolation**: Each barber's calendar is separate
- **Token Refresh**: Automatic refresh for persistent access
- **Rate Limiting**: Prevents API abuse
- **Error Recovery**: Graceful handling of sync failures

## 📊 Monitoring & Troubleshooting

### Connection Status

The system provides real-time status monitoring:
- **Connected**: Active and ready to sync
- **Needs Refresh**: Token expired, requires re-authorization
- **Not Connected**: Not set up or disconnected
- **Error**: Connection or sync issues

### Sync Logs

Detailed logging includes:
- Operation type (create, update, delete)
- Success/failure status
- Error messages and retry counts
- Performance metrics
- Appointment sync history

### Common Issues

1. **OAuth Callback URL Mismatch**
   - Ensure redirect URI in Google Cloud matches exactly
   - Include protocol (http/https) and full path

2. **Invalid Credentials**
   - Verify Client ID and Secret are correct
   - Check for extra spaces or characters

3. **Calendar API Not Enabled**
   - Ensure Google Calendar API is enabled in Google Cloud Console

4. **Sync Failures**
   - Check sync logs for specific error messages
   - Verify barber's Google Calendar permissions

## 🎯 Production Deployment

### Environment Variables for Production

```bash
GOOGLE_CALENDAR_CLIENT_ID=your_production_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_production_client_secret  
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/v1/google-calendar/oauth/callback
FEATURE_GOOGLE_CALENDAR_SYNC=true
```

### OAuth Consent Screen Requirements

For production use:
- Verify domain ownership in Google Search Console
- Complete OAuth consent screen with privacy policy
- Request verification if using sensitive scopes
- Add all production domains to authorized origins

### Testing in Production

1. Create test barber account
2. Connect Google Calendar
3. Create test appointment
4. Verify sync to Google Calendar
5. Test appointment updates and deletions
6. Verify disconnect functionality

## 📚 API Reference

### Available Endpoints

```
GET  /api/v1/google-calendar/status           - Check connection status
GET  /api/v1/google-calendar/connect          - Start OAuth flow  
GET  /api/v1/google-calendar/oauth/callback   - Handle OAuth callback
DELETE /api/v1/google-calendar/disconnect     - Disconnect calendar
GET  /api/v1/google-calendar/settings         - Get sync preferences
PUT  /api/v1/google-calendar/settings         - Update sync preferences
POST /api/v1/google-calendar/sync             - Manual bulk sync
GET  /api/v1/google-calendar/events           - Get calendar events
GET  /api/v1/google-calendar/sync-logs        - View sync history
```

### Frontend Components

- `GoogleCalendarSettings.tsx` - Main settings component
- `useGoogleCalendar.ts` - React hook for API interactions
- `/settings/google-calendar` - Dedicated settings page

## 🎉 Conclusion

The Google Calendar integration is **production-ready** and provides:

- **Seamless Integration**: Automatic, real-time synchronization
- **User Control**: Comprehensive customization options  
- **Enterprise Ready**: Secure, scalable, and maintainable
- **Developer Friendly**: Well-documented with testing framework

Once you complete the Google Cloud Console setup and environment configuration, barbers can immediately start connecting their calendars and enjoying seamless appointment synchronization.

---

**Need Help?** 
- Check the test script output for specific issues
- Review backend logs for detailed error messages
- Ensure all environment variables are set correctly
- Verify Google Cloud Console configuration matches exactly