# BookedBarber V2 - Staging Environment Setup Guide

## Overview
This guide documents the complete setup for the BookedBarber V2 staging environment on Render.com. The staging environment is used for testing features before production deployment.

## Current Status ✅
- **Frontend**: `https://sixfb-frontend-v2-staging.onrender.com` - ✅ **WORKING**
- **Backend**: `https://sixfb-backend-v2-staging.onrender.com` - ✅ **WORKING**
- **Database**: Staging PostgreSQL database needed
- **Branch**: `deployment-clean` (auto-deploys to staging)

## Architecture

### Staging Services
```
┌─ Frontend (Next.js) ─────────────┐    ┌─ Backend (FastAPI) ──────────────┐    ┌─ Database (PostgreSQL) ─┐
│ sixfb-frontend-v2-staging        │────┤ sixfb-backend-v2-staging         │────┤ sixfb-staging-db        │
│ Port: 3000                       │    │ Port: 8000                       │    │ Plan: Starter ($7/mo)  │
│ Plan: Starter ($7/mo)            │    │ Plan: Starter ($7/mo)            │    │ Version: PostgreSQL 15  │
└──────────────────────────────────┘    └──────────────────────────────────┘    └─────────────────────────┘
```

### Environment Separation
- **Development**: `localhost:3000` + `localhost:8000` (SQLite)
- **Staging**: `*.onrender.com` (PostgreSQL, cloud-hosted)
- **Production**: `bookedbarber.com` + `api.bookedbarber.com` (PostgreSQL, production)

## Required Environment Variables

### Backend Environment Variables (Set in Render Dashboard)
Navigate to: `https://dashboard.render.com/web/srv-[YOUR_BACKEND_SERVICE_ID]/env`

#### ⚠️ CRITICAL: Auto-Generated (Use Render's Generate Value Feature)
```bash
SECRET_KEY=[AUTO_GENERATED_64_CHAR_STRING]
JWT_SECRET_KEY=[AUTO_GENERATED_64_CHAR_STRING]
ENCRYPTION_KEY=[AUTO_GENERATED_64_CHAR_STRING]
```

#### 🔒 Stripe Test Keys (Manually Set)
```bash
STRIPE_SECRET_KEY=sk_test_[YOUR_STRIPE_TEST_SECRET_KEY]
STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_STRIPE_TEST_PUBLISHABLE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_test_[YOUR_TEST_WEBHOOK_SECRET]
STRIPE_CONNECT_CLIENT_ID=ca_[YOUR_TEST_CONNECT_CLIENT_ID]
```

#### 📧 Email Service (Optional for Staging)
```bash
SENDGRID_API_KEY=SG.[YOUR_SENDGRID_API_KEY]  # Optional for email testing
```

#### 📱 Google Services (Optional for Staging)
```bash
GOOGLE_CLIENT_ID=[STAGING_GOOGLE_CLIENT_ID].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[STAGING_GOOGLE_CLIENT_SECRET]
```

### Frontend Environment Variables (Set in Render Dashboard)
Navigate to: `https://dashboard.render.com/web/srv-[YOUR_FRONTEND_SERVICE_ID]/env`

#### 🔑 Stripe Test Keys
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_STRIPE_TEST_PUBLISHABLE_KEY]
```

## Database Setup

### Create Staging Database in Render
1. **Go to Render Dashboard** → Databases → Create Database
2. **Configuration**:
   - **Name**: `sixfb-staging-db`
   - **Database Name**: `sixfb_staging`
   - **User**: `sixfb_staging`
   - **Region**: `oregon`
   - **Plan**: `starter` ($7/month)
   - **Version**: `PostgreSQL 15`

3. **Connect to Backend Service**:
   - The `DATABASE_URL` will be auto-configured via the YAML configuration
   - Connection string format: `postgresql://user:password@host:5432/dbname`

### Database Migration
Once the database is created and connected:

```bash
# Run migrations on staging database (done automatically on first deploy)
cd backend-v2
alembic upgrade head
```

## Service Configuration Status

### ✅ Frontend Service (Configured)
- **Service Name**: `sixfb-frontend-v2-staging`
- **Branch**: `deployment-clean`
- **Build Command**: ✅ Fixed (resolves UI component imports)
- **Environment Variables**: ✅ Configured (needs Stripe test key)
- **Health Check**: ✅ Working (`https://sixfb-frontend-v2-staging.onrender.com`)

### ✅ Backend Service (Configured)
- **Service Name**: `sixfb-backend-v2-staging`
- **Branch**: `deployment-clean`
- **Environment Variables**: ⚠️ Needs manual setup (see above)
- **Health Check**: ✅ Working (`https://sixfb-backend-v2-staging.onrender.com/health`)
- **API Docs**: ✅ Available (`https://sixfb-backend-v2-staging.onrender.com/docs`)

### 🔧 Database Service (Needs Setup)
- **Database Name**: `sixfb-staging-db` (to be created)
- **Connection**: Will auto-configure via YAML when created

## Deployment Process

### Current Deployment Method
```bash
# Changes to deployment-clean branch automatically trigger staging deployment
git checkout deployment-clean
git push origin deployment-clean
```

### Manual Deployment (If Needed)
1. **Go to Render Dashboard**
2. **Navigate to Service** → Manual Deploy
3. **Select Branch**: `deployment-clean`
4. **Deploy**: Click "Deploy Latest"

## Testing & Validation

### Health Check Endpoints
```bash
# Frontend health check
curl https://sixfb-frontend-v2-staging.onrender.com

# Backend health check
curl https://sixfb-backend-v2-staging.onrender.com/health

# API documentation
curl https://sixfb-backend-v2-staging.onrender.com/docs
```

### Test User Account (After Database Setup)
```bash
# Test registration
curl -X POST https://sixfb-backend-v2-staging.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.com","password":"test123","name":"Test User"}'

# Test login
curl -X POST https://sixfb-backend-v2-staging.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.com","password":"test123"}'
```

## Security Configuration

### Staging-Specific Security Settings
- **CORS**: Allows staging domains + localhost for testing
- **Cookies**: Non-secure cookies allowed for testing
- **Rate Limiting**: Relaxed limits for testing (120/min vs 60/min production)
- **Debug Mode**: Enabled for troubleshooting
- **API Documentation**: Public access for testing

### What's Disabled in Staging
- **Analytics Tracking**: No GA/GTM tracking
- **Email Campaigns**: Marketing emails disabled
- **Production Integrations**: Live API keys disabled
- **MFA**: Disabled for easier testing

## Cost Breakdown (Monthly)
- **Frontend Service**: $7/month (Starter plan)
- **Backend Service**: $7/month (Starter plan)
- **PostgreSQL Database**: $7/month (Starter plan)
- **Total**: **$21/month** for complete staging environment

## Next Steps

### Immediate (Required for Full Functionality)
1. **Create PostgreSQL database** in Render dashboard
2. **Set Stripe test keys** in both frontend and backend services
3. **Generate security keys** using Render's auto-generation feature
4. **Test end-to-end flow** (registration → login → booking)

### Optional (Enhanced Testing)
1. **Configure SendGrid** for email testing
2. **Set up Google OAuth** for calendar integration testing
3. **Configure Sentry** for error tracking in staging
4. **Add custom domain** (e.g., `staging.bookedbarber.com`)

## Troubleshooting

### Common Issues
1. **Database Connection Failed**: Ensure PostgreSQL database is created and connected
2. **CORS Errors**: Check `CORS_ALLOWED_ORIGINS` includes staging domain
3. **Stripe Errors**: Verify test keys are set correctly (sk_test_*, pk_test_*)
4. **Build Failures**: Check build logs in Render dashboard

### Support Resources
- **Render Documentation**: https://render.com/docs
- **Service Logs**: Available in Render dashboard for each service
- **Health Checks**: Use endpoints above to verify service status

## Configuration Files
- **Staging Config**: `/render.staging.yaml` (comprehensive service definition)
- **Environment Template**: `/backend-v2/.env.staging` (environment variable reference)
- **This Guide**: `/backend-v2/STAGING_ENVIRONMENT_SETUP.md`

---

**Last Updated**: 2025-07-15
**Status**: Frontend and Backend services deployed and working. Database setup required for full functionality.