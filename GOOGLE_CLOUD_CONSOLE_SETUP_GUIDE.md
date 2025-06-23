# 🔧 Google Cloud Console Setup - Step-by-Step Guide

## 📋 **What You'll Need**
- Google account (personal or business)
- Access to Google Cloud Console
- About 10-15 minutes
- Your 6FB domain/URL information

---

## 🎯 **Step 1: Create Google Cloud Project**

### **1.1 Access Google Cloud Console**
1. Open your browser and go to: **https://console.cloud.google.com**
2. Sign in with your Google account
3. Accept terms of service if prompted

### **1.2 Create New Project**
1. Click the **project dropdown** at the top of the page (next to "Google Cloud")
2. Click **"New Project"** button
3. Fill out the project details:
   - **Project name**: `6FB-Calendar-Integration` (or your preferred name)
   - **Organization**: Leave default or select your organization
   - **Location**: Leave default or select your organization
4. Click **"Create"** button
5. Wait for project creation (usually takes 30-60 seconds)
6. Click **"Select Project"** when creation is complete

### **1.3 Verify Project Selection**
- Confirm the project name appears in the top navigation bar
- You should see the project dashboard

---

## 🔌 **Step 2: Enable Google Calendar API**

### **2.1 Navigate to APIs & Services**
1. Click the **hamburger menu** (☰) in the top-left corner
2. Scroll down and click **"APIs & Services"**
3. Click **"Library"** from the submenu

### **2.2 Find Google Calendar API**
1. In the search bar, type: **"Google Calendar API"**
2. Click on **"Google Calendar API"** from the results
3. You'll see the API details page

### **2.3 Enable the API**
1. Click the blue **"Enable"** button
2. Wait for activation (usually instant)
3. You'll be redirected to the API overview page
4. Confirm you see **"API enabled"** status

---

## 🔐 **Step 3: Configure OAuth Consent Screen**

### **3.1 Navigate to OAuth Consent**
1. In the left sidebar, click **"OAuth consent screen"**
2. Choose your user type:
   - **Internal**: If you have a Google Workspace organization
   - **External**: For most cases (recommended for 6FB)
3. Click **"Create"**

### **3.2 Configure App Information**
Fill out the OAuth consent screen:

**App Information:**
- **App name**: `6FB Booking Platform`
- **User support email**: Your email address
- **App logo**: Upload 6FB logo (optional, 120x120px PNG/JPG)

**App Domain (Optional but recommended):**
- **Application home page**: `https://yourdomain.com` (your 6FB domain)
- **Application privacy policy link**: `https://yourdomain.com/privacy`
- **Application terms of service link**: `https://yourdomain.com/terms`

**Authorized Domains:**
- Add your domain: `yourdomain.com` (without https://)
- For development, also add: `localhost`

**Developer Contact Information:**
- **Email addresses**: Your email address

### **3.3 Save and Continue**
1. Click **"Save and Continue"**
2. You'll move to the "Scopes" section

### **3.4 Configure Scopes**
1. Click **"Add or Remove Scopes"**
2. Search for and select:
   - `../auth/calendar` - See, edit, share, and permanently delete all calendars
   - `../auth/calendar.events` - View and edit events on all calendars
3. Click **"Update"**
4. Click **"Save and Continue"**

### **3.5 Test Users (for External apps)**
If you selected "External":
1. Click **"Add Users"**
2. Add your email and any test user emails
3. Click **"Save and Continue"**

### **3.6 Summary**
1. Review all information
2. Click **"Back to Dashboard"**

---

## 🔑 **Step 4: Create OAuth 2.0 Credentials**

### **4.1 Navigate to Credentials**
1. In the left sidebar, click **"Credentials"**
2. Click **"Create Credentials"** dropdown
3. Select **"OAuth 2.0 Client IDs"**

### **4.2 Configure OAuth Client**
Fill out the client information:

**Application type:** `Web application`

**Name:** `6FB Calendar Integration Client`

**Authorized JavaScript origins:**
- `http://localhost:3000` (for development frontend)
- `https://yourdomain.com` (for production frontend)

**Authorized redirect URIs:**
- `http://localhost:8000/api/v1/google-calendar/oauth/callback` (development)
- `https://yourdomain.com/api/v1/google-calendar/oauth/callback` (production)

### **4.3 Create Client**
1. Click **"Create"**
2. A modal will appear with your credentials

### **4.4 Save Your Credentials** ⚠️ **IMPORTANT**
**Copy and save these immediately:**
- **Client ID**: `123456789-abcdefg.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdefghijklmnop`

**Don't lose these!** You'll need them for your environment variables.

### **4.5 Download JSON (Optional)**
1. Click **"Download JSON"** to save a backup
2. Store this file securely (don't commit to version control)

---

## ⚙️ **Step 5: Configure 6FB Backend**

### **5.1 Update Environment Variables**
Add these to your `/Users/bossio/6fb-booking/backend/.env` file:

```env
# Google Calendar API Configuration
GOOGLE_CALENDAR_CLIENT_ID=YOUR_CLIENT_ID_FROM_STEP_4
GOOGLE_CALENDAR_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_STEP_4
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/google-calendar/oauth/callback

# Optional Settings
GOOGLE_CALENDAR_ENABLE_WEBHOOKS=true
GOOGLE_CALENDAR_WEBHOOK_TOKEN=your_secure_random_token_here
```

### **5.2 Example Configuration**
```env
# Example (use your actual values)
GOOGLE_CALENDAR_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-1234567890abcdefghijk
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/google-calendar/oauth/callback
```

### **5.3 Restart Backend Server**
```bash
cd /Users/bossio/6fb-booking/backend
pkill -f uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🧪 **Step 6: Test the Integration**

### **6.1 Verify Backend Setup**
Test the Google Calendar endpoint:
```bash
curl http://localhost:8000/api/v1/google-calendar/status
```

**Expected Response:**
```json
{"error":"Not authenticated","message":"Not authenticated"}
```
This is correct! It means the endpoint exists and authentication is working.

### **6.2 Test Frontend Access**
1. Open your browser to: `http://localhost:3000/settings/google-calendar`
2. You should see the Google Calendar settings page
3. Look for a "Connect Google Calendar" button

### **6.3 Test OAuth Flow**
1. Click **"Connect Google Calendar"**
2. You should be redirected to Google's OAuth page
3. Sign in and grant calendar permissions
4. You should be redirected back to 6FB with connection success

---

## 🔧 **Step 7: Production Configuration**

### **7.1 Update OAuth Settings for Production**
When deploying to production:

1. Go back to **Google Cloud Console** → **Credentials**
2. Click on your OAuth client ID
3. Add production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/api/v1/google-calendar/oauth/callback`

### **7.2 Update Environment Variables**
```env
# Production settings
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/v1/google-calendar/oauth/callback
```

### **7.3 Publish OAuth App**
For production use:
1. Go to **OAuth consent screen**
2. Click **"Publish App"**
3. Submit for verification if needed (for large user bases)

---

## ✅ **Step 8: Verification Checklist**

Before finishing, verify:

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 client credentials created
- [ ] Environment variables added to `.env`
- [ ] Backend server restarted
- [ ] Test API endpoint returns authentication error (correct behavior)
- [ ] Frontend settings page accessible
- [ ] OAuth flow works (can connect to Google Calendar)

---

## 🆘 **Troubleshooting Common Issues**

### **Issue 1: "redirect_uri_mismatch" Error**
**Solution:**
- Verify the redirect URI in Google Console exactly matches your `.env` file
- Check for typos, extra slashes, or http vs https

### **Issue 2: "invalid_client" Error**
**Solution:**
- Double-check your Client ID and Client Secret
- Ensure they're correctly copied to `.env` file
- Restart backend server after updating `.env`

### **Issue 3: "access_denied" Error**
**Solution:**
- Check OAuth consent screen configuration
- Ensure your email is added as a test user (for External apps)
- Verify required scopes are added

### **Issue 4: API Not Enabled**
**Solution:**
- Go to Google Cloud Console → APIs & Services → Library
- Search for "Google Calendar API" and ensure it's enabled
- Wait a few minutes for propagation

---

## 🎉 **Success!**

You've successfully configured Google Calendar integration! Your users can now:

- Connect their Google Calendar accounts
- Automatically sync 6FB appointments to Google Calendar
- Customize what information gets synced
- Import Google Calendar events to prevent double-booking

**Next Steps:**
1. Test the full workflow with a sample appointment
2. Configure user preferences and privacy settings
3. Train your team on the new calendar features
4. Deploy to production when ready

Need help with any of these steps? Let me know and I'll guide you through the specific issue!
