# 📋 Development Setup Guide

## 🚀 Quick Start (Essential Features)

The calendar app will work with the current configuration for all core features:
- ✅ **Calendar views** (day, week, month)
- ✅ **Appointment management** (create, edit, cancel)
- ✅ **Drag & drop** functionality
- ✅ **Real-time updates**
- ✅ **Mobile responsiveness**

## 🔧 Optional API Configurations

These services enhance the calendar with additional features but are **not required** for basic functionality:

### 1. Google Calendar Integration
**What it enables**: Two-way sync with Google Calendar

**Setup Instructions**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
   ```

### 2. Email Notifications (SendGrid)
**What it enables**: Automated appointment reminders and confirmations

**Setup Instructions**:
1. Sign up at [SendGrid](https://sendgrid.com)
2. Get API key from Settings → API Keys
3. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG.your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=Your Business Name
   ```

### 3. SMS Notifications (Twilio)
**What it enables**: SMS appointment reminders and confirmations

**Setup Instructions**:
1. Sign up at [Twilio](https://www.twilio.com)
2. Get credentials from Console Dashboard
3. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### 4. Error Tracking (Sentry)
**What it enables**: Advanced error monitoring and performance tracking

**Setup Instructions**:
1. Sign up at [Sentry](https://sentry.io)
2. Create a new project
3. Get DSN from Settings → Projects → [Your Project] → Keys
4. Add to `.env`:
   ```
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   SENTRY_ENVIRONMENT=development
   ```

## 🛠️ Development Commands

### Start Development Server
```bash
# Backend (from backend-v2 directory)
uvicorn main:app --reload --port 8000

# Frontend (from backend-v2/frontend-v2 directory)
npm run dev
```

### Run Tests
```bash
# Backend tests
cd backend-v2
pytest

# Frontend tests
cd backend-v2/frontend-v2
npm test
```

### Database Operations
```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision -m "description"

# Reset database (development only)
rm 6fb_booking.db
alembic upgrade head
```

## 🔍 Troubleshooting

### Common Issues

1. **"Missing API Key" warnings**: These are normal in development mode. The app will still function without optional services.

2. **Port conflicts**: If you see `EADDRINUSE` errors:
   ```bash
   # Kill processes on ports 3000 and 8000
   lsof -ti:3000 | xargs kill -9
   lsof -ti:8000 | xargs kill -9
   ```

3. **Database locked**: Stop all running servers and try again:
   ```bash
   pkill -f "uvicorn"
   pkill -f "npm run dev"
   ```

### Development Mode Features

- **Mock Services**: When API keys are missing, the app uses mock implementations
- **Debug Logging**: Enhanced logging for development
- **Hot Reload**: Automatic server restart on code changes
- **CORS Enabled**: Frontend can connect to backend

## 📊 Feature Status

| Feature | Status | Required API Key |
|---------|--------|------------------|
| Calendar Views | ✅ Working | None |
| Appointment Management | ✅ Working | None |
| Drag & Drop | ✅ Working | None |
| Google Calendar Sync | ⚠️ Optional | Google OAuth |
| Email Notifications | ⚠️ Optional | SendGrid |
| SMS Notifications | ⚠️ Optional | Twilio |
| Error Tracking | ⚠️ Optional | Sentry |
| Payment Processing | ⚠️ Test Mode | Stripe (test keys) |

## 🎯 Next Steps

1. **Start with core features**: The calendar works great without any API keys
2. **Add integrations as needed**: Configure services based on your requirements
3. **Test thoroughly**: Use the development environment to verify everything works
4. **Deploy gradually**: Start with core features, add integrations later

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate API keys regularly
- Monitor logs for suspicious activity
- Keep this setup guide updated as features are added

---

**Ready to start?** Just run `uvicorn main:app --reload` in the backend-v2 directory and `npm run dev` in the frontend-v2 directory. The calendar will be fully functional!