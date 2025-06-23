# 🗓️ Google Calendar Integration - Complete Setup Walkthrough

## 🎯 **What This Integration Does**

The Google Calendar integration allows 6FB Booking Platform users to:
- **Automatically sync** 6FB appointments to their Google Calendar
- **Import Google Calendar events** to prevent double-booking
- **Customize sync preferences** (which appointments, what information)
- **Maintain privacy** with granular control over shared data

---

## 🔧 **Step 1: Google Cloud Console Setup**

### **1.1 Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "New Project" or select existing project
3. Name your project (e.g., "6FB-Calendar-Integration")
4. Note the Project ID

### **1.2 Enable Google Calendar API**
1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### **1.3 Create OAuth 2.0 Credentials**
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen:
   - Application name: "6FB Booking Platform"
   - User support email: your email
   - Developer contact: your email
   - Authorized domains: your domain (e.g., `bookbarber.com`)
4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "6FB Calendar Integration"
   - Authorized redirect URIs:
     - `http://localhost:8000/api/v1/google-calendar/oauth/callback` (development)
     - `https://yourdomain.com/api/v1/google-calendar/oauth/callback` (production)

### **1.4 Download Credentials**
1. Download the JSON credentials file
2. Note the `client_id` and `client_secret`

---

## ⚙️ **Step 2: Backend Configuration**

### **2.1 Environment Variables**
Add these to your `.env` file:

```env
# Google Calendar API Configuration
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_from_google_console
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_from_google_console
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/google-calendar/oauth/callback

# Optional: Google Calendar Settings
GOOGLE_CALENDAR_ENABLE_WEBHOOKS=true
GOOGLE_CALENDAR_WEBHOOK_TOKEN=your_secure_webhook_token
```

### **2.2 Verify Backend Setup**
Test that the endpoints are working:

```bash
# Check if Google Calendar endpoints are available
curl http://localhost:8000/api/v1/google-calendar/status

# Should return: {"error":"Not authenticated"} - this is correct!
```

---

## 🎨 **Step 3: Frontend Integration**

### **3.1 Access Google Calendar Settings**
Navigate to: `http://localhost:3000/settings/google-calendar`

### **3.2 Connect Google Calendar**
1. Click "Connect Google Calendar" button
2. Complete OAuth flow in popup window
3. Grant calendar access permissions
4. Return to 6FB with connected status

### **3.3 Configure Sync Preferences**
- **What to sync**: All appointments, confirmed only, paid only
- **Information to include**: Client name, phone, email, service details
- **Privacy settings**: Event visibility, information sharing
- **Sync timing**: Real-time, manual, scheduled

---

## 🔄 **Step 4: How Sync Works**

### **4.1 Automatic Sync Triggers**
- **Appointment created** → Google Calendar event created
- **Appointment updated** → Google Calendar event updated
- **Appointment deleted** → Google Calendar event deleted
- **Appointment status changed** → Event details updated

### **4.2 Manual Sync Options**
- **Bulk sync**: Sync all existing appointments
- **Selective sync**: Choose date range or specific appointments
- **Re-sync**: Fix any sync discrepancies

### **4.3 Bidirectional Sync (Optional)**
- Import Google Calendar events as "blocked time"
- Prevent double-booking across calendars
- Conflict detection and resolution

---

## 📱 **Step 5: User Experience**

### **5.1 Calendar Interface**
- 6FB appointments show with full details
- Google Calendar events show as "blocked time"
- Sync status indicators (synced, pending, failed)
- Color coding for different appointment types

### **5.2 Mobile Integration**
- Google Calendar mobile app shows 6FB appointments
- Push notifications for appointment reminders
- Seamless experience across devices

---

## 🔐 **Step 6: Security & Privacy**

### **6.1 Data Privacy**
- Users control what information is shared
- Optional client information exclusion
- Secure credential storage with encryption
- Regular credential refresh

### **6.2 Compliance**
- HIPAA-compliant options available
- PCI DSS compliant data handling
- GDPR compliance for EU users
- Audit logs for all sync operations

---

## 🧪 **Step 7: Testing & Verification**

### **7.1 Connection Testing**
```bash
# Test OAuth flow (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/v1/google-calendar/status
```

### **7.2 Sync Testing**
1. Create appointment in 6FB calendar
2. Check Google Calendar for synced event
3. Modify appointment in 6FB
4. Verify changes in Google Calendar
5. Delete appointment and confirm removal

### **7.3 Error Handling**
- Invalid credentials → Clear error message + re-auth flow
- API rate limits → Automatic retry with backoff
- Network issues → Queue sync for later
- Conflict detection → User notification + resolution options

---

## 🚀 **Step 8: Production Deployment**

### **8.1 Update OAuth Settings**
- Add production domain to Google Console
- Update redirect URI for production
- Configure production environment variables

### **8.2 Monitoring**
- Sync success/failure rates
- API quota usage
- User adoption metrics
- Performance monitoring

### **8.3 Support**
- User documentation for calendar setup
- Troubleshooting guides
- Support ticket integration
- Video tutorials

---

## 📊 **Step 9: Advanced Features**

### **9.1 Calendar Sharing**
- Share appointment calendars with team members
- Location-based calendar views
- Manager oversight dashboards

### **9.2 Integration Enhancements**
- Multiple Google accounts per user
- Calendar-specific sync rules
- Advanced reminder configurations
- Integration with Google Meet

### **9.3 Analytics**
- Sync usage statistics
- User engagement metrics
- Calendar utilization reports
- Performance optimization insights

---

## ❓ **Step 10: Troubleshooting**

### **Common Issues:**

1. **"Failed to connect to Google Calendar"**
   - Check client ID/secret configuration
   - Verify redirect URI matches exactly
   - Ensure Google Calendar API is enabled

2. **"Appointments not syncing"**
   - Check user sync preferences
   - Verify Google Calendar permissions
   - Review sync logs for errors

3. **"OAuth callback errors"**
   - Confirm redirect URI in Google Console
   - Check for CORS issues
   - Verify SSL certificates

### **Support Resources:**
- Google Calendar API documentation
- 6FB integration troubleshooting guide
- Community support forum
- Direct technical support

---

## 🎉 **Congratulations!**

Your Google Calendar integration is now fully configured and ready to provide seamless calendar synchronization for your 6FB Booking Platform users!

For additional support or advanced configuration options, refer to the detailed technical documentation or contact our support team.
