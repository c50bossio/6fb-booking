# Railway Deployment Guide for 6FB Booking Platform

This guide provides step-by-step instructions for deploying the 6FB Booking Platform to Railway.

## 🚀 Quick Start

### Prerequisites

1. **Railway Account**: [Sign up at railway.app](https://railway.app)
2. **Railway CLI**: Install via npm:
   ```bash
   npm install -g @railway/cli
   ```
3. **Git Repository**: Your code should be in a Git repository

### Step 1: Login to Railway

```bash
railway login
```

### Step 2: Create New Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Connect your GitHub repository
3. Select the 6fb-booking repository

### Step 3: Set Up Services

You need to create **two separate services** in Railway:

#### A. Backend API Service

1. In Railway dashboard, click "Add Service" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to `/` (project root)
4. Railway will detect it's a Python app

#### B. Frontend Service

1. Click "Add Service" → "GitHub Repo" again
2. Select the same repository
3. Set the **Root Directory** to `/frontend`
4. Railway will detect it's a Node.js app

#### C. Database Service

1. Click "Add Service" → "Database" → "PostgreSQL"
2. Railway will automatically create a PostgreSQL database
3. The `DATABASE_URL` will be automatically provided to your backend

## 🔧 Environment Variables Setup

### Automated Setup

Use our setup script:

```bash
# For backend service
cd your-project-root
./scripts/setup-railway-env.sh

# For frontend service
cd frontend
./scripts/setup-railway-env.sh
```

### Manual Setup

#### Backend Environment Variables

In Railway dashboard, go to your **Backend service** → Variables:

```bash
# Core Settings
ENVIRONMENT=production
WORKERS=2
DB_POOL_SIZE=20
PYTHONPATH=/app/backend

# Security (generate secure keys)
SECRET_KEY=your-64-char-secret-key
JWT_SECRET_KEY=your-64-char-jwt-key

# CORS (replace with your actual Railway URLs)
FRONTEND_URL=https://your-frontend.up.railway.app
ALLOWED_ORIGINS=https://your-frontend.up.railway.app,https://localhost:3000

# Stripe (production keys)
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Email (SendGrid recommended)
SENDGRID_API_KEY=SG.your_api_key
FROM_EMAIL=your-email@domain.com

# Optional: SMS notifications
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

#### Frontend Environment Variables

In Railway dashboard, go to your **Frontend service** → Variables:

```bash
# Core Settings
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production

# API Connection (replace with your backend Railway URL)
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app

# App Configuration
NEXT_PUBLIC_APP_NAME=6FB Booking
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
```

## 🚀 Deployment

### Option 1: Automated Deployment

```bash
./scripts/deploy-to-railway.sh
```

### Option 2: Manual Deployment

```bash
# Deploy backend
railway up --detach

# Deploy frontend (from frontend directory)
cd frontend
railway up --detach
```

### Option 3: Auto-Deploy from Git

Railway automatically deploys when you push to your connected Git branch.

## 🏥 Health Monitoring

### Check Deployment Status

```bash
# Check all services
railway ps

# Check logs
railway logs

# Health check script
./scripts/railway-health-check.sh
```

### Service URLs

After successful deployment:

- **Backend API**: `https://your-backend.up.railway.app`
- **API Documentation**: `https://your-backend.up.railway.app/docs`
- **Health Check**: `https://your-backend.up.railway.app/api/v1/health`
- **Frontend**: `https://your-frontend.up.railway.app`

## 🔧 Configuration Files

The following files are configured for Railway deployment:

### Backend Configuration
- `/railway.toml` - Main backend Railway config
- `/backend/Procfile` - Process definitions
- `/backend/requirements.txt` - Python dependencies
- `/backend/main.py` - Updated for Railway port handling

### Frontend Configuration
- `/frontend/railway.toml` - Frontend Railway config
- `/frontend/package.json` - Updated start scripts
- `/frontend/next.config.js` - Railway-optimized Next.js config

## 🚨 Troubleshooting

### Common Issues

#### 1. Deployment Fails

**Check build logs:**
```bash
railway logs --tail 100
```

**Common solutions:**
- Verify environment variables are set
- Check that Railway detected the correct language/framework
- Ensure all dependencies are in requirements.txt/package.json

#### 2. Backend Cannot Connect to Database

**Check:**
- PostgreSQL service is running: `railway ps`
- DATABASE_URL is automatically set by Railway
- Backend service has access to database service

#### 3. Frontend Cannot Connect to Backend

**Check:**
- Backend service is healthy: Visit `/api/v1/health`
- CORS origins include frontend URL
- Frontend has correct `NEXT_PUBLIC_API_URL`

#### 4. Environment Variables Missing

**List all variables:**
```bash
railway variables
```

**Set missing variables:**
```bash
railway variables set KEY=VALUE
```

### Health Check Script

Run comprehensive health checks:

```bash
./scripts/railway-health-check.sh
```

This script will:
- Check service connectivity
- Test health endpoints
- Verify CORS configuration
- Show recent logs
- Provide troubleshooting guidance

## 🔗 Useful Railway Commands

```bash
# Service management
railway ps                    # List all services
railway open                  # Open deployed service
railway logs                  # View logs
railway logs --tail 50       # Last 50 log lines

# Environment variables
railway variables             # List all variables
railway variables set KEY=VAL # Set variable
railway variables unset KEY   # Remove variable

# Deployment
railway up                    # Deploy current service
railway up --detach          # Deploy in background
railway redeploy             # Redeploy without code changes

# Project management
railway status               # Project status
railway whoami              # Current user
railway projects            # List projects
```

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)
- [Railway Templates](https://railway.app/templates)

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: `railway logs`
2. **Run health check**: `./scripts/railway-health-check.sh`
3. **Verify environment variables**: `railway variables`
4. **Check service status**: `railway ps`
5. **Review this guide**: Ensure all steps were followed

For additional support, reach out to the Railway community or check the platform documentation.

---

## ✅ Deployment Checklist

- [ ] Railway account created and CLI installed
- [ ] Repository connected to Railway
- [ ] Backend service created with correct root directory (`/`)
- [ ] Frontend service created with correct root directory (`/frontend`)
- [ ] PostgreSQL database service added
- [ ] Backend environment variables configured
- [ ] Frontend environment variables configured
- [ ] Security keys generated and set
- [ ] Stripe keys configured (production)
- [ ] Email service configured (SendGrid)
- [ ] CORS origins set correctly
- [ ] Services deployed successfully
- [ ] Health checks passing
- [ ] DNS/domains configured (if needed)

Once all items are checked, your 6FB Booking Platform should be fully operational on Railway! 🎉
