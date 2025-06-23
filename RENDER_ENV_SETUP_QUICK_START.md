# Render Environment Setup Quick Start Guide

## 🚀 Get Your App Running in 10 Minutes

This guide focuses on the **absolute minimum** environment variables needed to deploy your 6FB Booking Platform to Render successfully. You can add optional integrations later.

---

## Phase 1: MUST HAVE NOW (Core Functionality)

These variables are **required** for the application to start and run basic functionality:

### 1. Security Keys (CRITICAL)
```bash
SECRET_KEY=your-64-character-secret-key-here
JWT_SECRET_KEY=your-64-character-jwt-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**How to generate:**
```bash
# Run this command twice to get two different keys
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2. Database (Auto-configured by Render)
```bash
DATABASE_URL=<automatically-provided-by-render>  # pragma: allowlist secret
```
**Note:** Render PostgreSQL will automatically provide this - you don't need to set it manually.

### 3. Basic App Settings
```bash
ENVIRONMENT=production
LOG_LEVEL=INFO
WORKERS=2
API_V1_STR=/api/v1
```

### 4. Frontend URLs (Update with your actual domains)
```bash
FRONTEND_URL=https://your-frontend-app.onrender.com
NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
ALLOWED_ORIGINS=https://your-frontend-app.onrender.com
```

---

## Phase 2: CAN ADD LATER (Optional Integrations)

These can be added after initial deployment:

### Payment Processing
- `STRIPE_SECRET_KEY` (for payments)
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Email Notifications
- `SENDGRID_API_KEY` (for email notifications)
- `FROM_EMAIL`
- `EMAIL_FROM_NAME`

### Monitoring
- `SENTRY_DSN` (for error tracking)
- `NEXT_PUBLIC_GA_TRACKING_ID` (for analytics)

---

## Step-by-Step Render Dashboard Setup

### Step 1: Create Backend Service

1. **Login to Render Dashboard**
   - Go to https://dashboard.render.com
   - Sign in with your account

2. **Create New Web Service**
   - Click "New +" button (top right)
   - Select "Web Service"
   - Connect your GitHub repository
   - Select the `6fb-booking` repository

3. **Configure Service Settings**
   ```
   Name: sixfb-backend
   Environment: Python 3
   Build Command: cd backend && pip install -r requirements.txt
   Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### Step 2: Add PostgreSQL Database

1. **Create Database**
   - In Render Dashboard, click "New +" → "PostgreSQL"
   - Name: `sixfb-database`
   - Database: `sixfb_booking`
   - User: `sixfb_user`

2. **Connect to Backend Service**
   - Go to your backend service settings
   - In "Environment" tab, Render will automatically add `DATABASE_URL`

### Step 3: Set Environment Variables

**In your backend service Environment tab, add these variables:**

```bash
# Security (REQUIRED)
SECRET_KEY=5RYIKM4gkD1SrTg-Kj8cXxlW90Qz1Y4ZEiUcvv28IrH7H-WhlrQqkDM_i_GwDNwbnmxWEd9NXatZIy-jqhPt-g
JWT_SECRET_KEY=1rPvQkhKd1tGXcbnUDHZ0GUHe5envwKdStL68ttwyT4ch2DjLbZdLjLd1AVDxLE5aPZ5VoF4czvUbg_0Hg1xWg
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# App Settings (REQUIRED)
ENVIRONMENT=production
LOG_LEVEL=INFO
WORKERS=2
API_V1_STR=/api/v1

# Frontend URLs (UPDATE THESE)
FRONTEND_URL=https://your-frontend-app.onrender.com
NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
ALLOWED_ORIGINS=https://your-frontend-app.onrender.com

# CORS (REQUIRED)
BACKEND_CORS_ORIGINS=["https://your-frontend-app.onrender.com"]
```

### Step 4: Create Frontend Service

1. **Create New Static Site**
   - Click "New +" → "Static Site"
   - Connect same repository
   - Root Directory: `frontend`

2. **Configure Build Settings**
   ```
   Build Command: npm install && npm run build
   Publish Directory: out
   ```

3. **Add Frontend Environment Variables**
   ```bash
   NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
   NEXT_PUBLIC_FRONTEND_URL=https://your-frontend-app.onrender.com
   ```

### Step 5: Update URLs

**After both services are deployed:**

1. **Get your service URLs:**
   - Backend: `https://your-backend-app.onrender.com`
   - Frontend: `https://your-frontend-app.onrender.com`

2. **Update environment variables with actual URLs:**
   - Go to backend service → Environment tab
   - Update `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, and `ALLOWED_ORIGINS`
   - Go to frontend service → Environment tab
   - Update `NEXT_PUBLIC_API_URL`

---

## Quick Verification Checklist

After deployment, verify these endpoints:

- ✅ **Backend Health:** `https://your-backend-app.onrender.com/health`
- ✅ **API Docs:** `https://your-backend-app.onrender.com/docs`
- ✅ **Frontend:** `https://your-frontend-app.onrender.com`
- ✅ **Database Connection:** Check backend logs for "Database connected successfully"

---

## Troubleshooting Common Issues

### ❌ "Internal Server Error"
**Cause:** Missing `SECRET_KEY` or `JWT_SECRET_KEY`
**Fix:** Add both keys to environment variables

### ❌ "Database connection failed"
**Cause:** `DATABASE_URL` not set or incorrect
**Fix:** Ensure PostgreSQL service is connected to your web service

### ❌ "CORS Error" in browser
**Cause:** `ALLOWED_ORIGINS` doesn't match frontend URL
**Fix:** Update `ALLOWED_ORIGINS` with exact frontend URL

### ❌ Frontend can't connect to API
**Cause:** `NEXT_PUBLIC_API_URL` incorrect
**Fix:** Update with exact backend URL

---

## Next Steps (After Basic Deployment)

1. **Set up Stripe** (for payments)
2. **Configure SendGrid** (for email notifications)
3. **Add Sentry** (for error monitoring)
4. **Set up Google Calendar** (for calendar sync)
5. **Configure custom domain**

---

## Emergency Fixes

If deployment fails:

1. **Check Render build logs** for specific error messages
2. **Verify all REQUIRED variables** are set
3. **Ensure database service** is running
4. **Check CORS settings** match your frontend URL

For immediate help, check:
- Backend logs: Render Dashboard → Your Service → Logs
- Frontend logs: Render Dashboard → Your Static Site → Logs

---

## Summary: Minimal Working Configuration

**Backend Environment Variables (7 required):**
```bash
SECRET_KEY=<64-char-secret>
JWT_SECRET_KEY=<64-char-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=production
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://your-frontend-app.onrender.com
```

**Frontend Environment Variables (2 required):**
```bash
NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
NEXT_PUBLIC_FRONTEND_URL=https://your-frontend-app.onrender.com
```

**Services to Create:**
1. PostgreSQL Database
2. Web Service (Backend)
3. Static Site (Frontend)

This configuration will get your app running with basic functionality. Add integrations later as needed.
