# Render Staging Service Setup Guide

## Overview
This guide walks you through setting up a staging environment on Render that will auto-deploy from the `staging` branch.

## Prerequisites
- Render account with access to your BookedBarber project
- GitHub repository connected to Render
- Domain access to configure staging.bookedbarber.com

## Step 1: Create Staging Backend Service

### 1.1 In Render Dashboard
1. Go to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository if not already connected
4. Select your BookedBarber repository

### 1.2 Configure Backend Service
```
Service Name: bookedbarber-backend-staging
Environment: Docker
Branch: staging
Root Directory: backend-v2
Build Command: (leave empty - uses Dockerfile)
Start Command: (leave empty - uses Dockerfile CMD)
```

### 1.3 Environment Variables (Backend Staging)
Add these environment variables in Render:

```bash
# Basic Configuration
ENVIRONMENT=staging
DEBUG=false
SECRET_KEY=<generate-random-secret>
JWT_SECRET_KEY=<generate-random-jwt-secret>

# Database (Render PostgreSQL)
DATABASE_URL=<render-postgres-connection-string>

# CORS Configuration
CORS_ALLOW_ORIGINS=["https://staging.bookedbarber.com"]
CORS_ALLOW_CREDENTIALS=true

# Cache (Render Redis)
REDIS_URL=<render-redis-connection-string>
ENABLE_CACHING=true

# External Services (Use staging/test keys)
STRIPE_PUBLISHABLE_KEY=<staging-stripe-key>
STRIPE_SECRET_KEY=<staging-stripe-secret>
SENDGRID_API_KEY=<staging-sendgrid-key>
TWILIO_ACCOUNT_SID=<staging-twilio-sid>
TWILIO_AUTH_TOKEN=<staging-twilio-token>

# Google Services (Staging)
GOOGLE_CLIENT_ID=<staging-google-client-id>
GOOGLE_CLIENT_SECRET=<staging-google-client-secret>

# Monitoring
SENTRY_DSN=<staging-sentry-dsn>
```

### 1.4 Advanced Settings
```
Auto-Deploy: Yes
Deploy Hook: <copy this URL for GitHub Actions>
Health Check Path: /health
```

## Step 2: Create Staging Frontend Service

### 2.1 Configure Frontend Service
```
Service Name: bookedbarber-frontend-staging
Environment: Node
Branch: staging
Root Directory: backend-v2/frontend-v2
Build Command: npm ci && npm run build
Start Command: npm start
```

### 2.2 Environment Variables (Frontend Staging)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://bookedbarber-backend-staging.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://bookedbarber-backend-staging.onrender.com/api/v1

# Frontend Configuration
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=staging

# External Service Keys (Frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<staging-stripe-key>
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=<staging-ga-id>
NEXT_PUBLIC_SENTRY_DSN=<staging-frontend-sentry-dsn>
```

### 2.3 Advanced Settings
```
Auto-Deploy: Yes
Deploy Hook: <copy this URL for GitHub Actions>
Health Check Path: /api/health
```

## Step 3: Create Database and Redis

### 3.1 PostgreSQL Database
1. Go to "New +" → "PostgreSQL"
2. Configure:
   ```
   Name: bookedbarber-staging-db
   Database Name: bookedbarber_staging
   User: postgres
   ```
3. Copy the connection string to backend environment variables

### 3.2 Redis Cache
1. Go to "New +" → "Redis"
2. Configure:
   ```
   Name: bookedbarber-staging-redis
   ```
3. Copy the connection string to backend environment variables

## Step 4: Configure Custom Domain

### 4.1 Backend Domain
1. In backend service settings, go to "Custom Domains"
2. Add domain: `staging-api.bookedbarber.com`
3. Configure DNS:
   ```
   CNAME staging-api.bookedbarber.com -> bookedbarber-backend-staging.onrender.com
   ```

### 4.2 Frontend Domain
1. In frontend service settings, go to "Custom Domains"
2. Add domain: `staging.bookedbarber.com`
3. Configure DNS:
   ```
   CNAME staging.bookedbarber.com -> bookedbarber-frontend-staging.onrender.com
   ```

## Step 5: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

### 5.1 Render Deploy Hooks
```
RENDER_STAGING_BACKEND_DEPLOY_HOOK=<backend-deploy-hook-url>
RENDER_STAGING_FRONTEND_DEPLOY_HOOK=<frontend-deploy-hook-url>
RENDER_PRODUCTION_BACKEND_DEPLOY_HOOK=<production-backend-deploy-hook-url>
RENDER_PRODUCTION_FRONTEND_DEPLOY_HOOK=<production-frontend-deploy-hook-url>
```

### 5.2 Render API Configuration
```
RENDER_API_KEY=<your-render-api-key>
RENDER_STAGING_MIGRATION_HOOK=<staging-migration-hook-url>
RENDER_PRODUCTION_MIGRATION_HOOK=<production-migration-hook-url>
```

### 5.3 Health Check URLs
```
STAGING_BACKEND_URL=https://staging-api.bookedbarber.com
STAGING_FRONTEND_URL=https://staging.bookedbarber.com
```

### 5.4 Optional Notifications
```
SLACK_WEBHOOK=<slack-webhook-url>
```

## Step 6: Test the Setup

### 6.1 Push to Staging Branch
```bash
git checkout staging
git merge develop
git push origin staging
```

### 6.2 Monitor Deployment
1. Check GitHub Actions workflow
2. Monitor Render service logs
3. Verify both services deploy successfully

### 6.3 Test Health Endpoints
```bash
curl https://staging-api.bookedbarber.com/health
curl https://staging.bookedbarber.com/api/health
```

### 6.4 Test Domain Access
- Navigate to https://staging.bookedbarber.com
- Verify the application loads correctly
- Test basic functionality (login, navigation)

## Step 7: Database Migration

### 7.1 Run Initial Migration
In the Render backend service shell:
```bash
alembic upgrade head
```

### 7.2 Set Up Migration Hook
Configure webhook URL for automatic migrations during deployments.

## Troubleshooting

### Common Issues

#### 1. Domain Not Accessible
- Check DNS propagation (can take 24-48 hours)
- Verify CNAME records are correct
- Check Render custom domain status

#### 2. Build Failures
- Check build logs in Render dashboard
- Verify environment variables are set
- Check Dockerfile and package.json configurations

#### 3. Database Connection Issues
- Verify DATABASE_URL is correct
- Check if database service is running
- Test connection from backend service shell

#### 4. CORS Errors
- Verify CORS_ALLOW_ORIGINS includes staging domain
- Check frontend API URL configuration
- Ensure both HTTP and HTTPS are handled

#### 5. GitHub Actions Deployment Failures
- Check webhook URLs are correct
- Verify GitHub secrets are properly set
- Monitor Render deployment logs

### Quick Fixes

```bash
# Test backend health
curl -f https://staging-api.bookedbarber.com/health

# Test frontend health  
curl -f https://staging.bookedbarber.com/api/health

# Check DNS resolution
nslookup staging.bookedbarber.com
nslookup staging-api.bookedbarber.com

# Test database connection (from Render shell)
python -c "from database import engine; print(engine.execute('SELECT 1').scalar())"
```

## Next Steps

1. ✅ Complete Render service setup
2. ✅ Configure domains and DNS
3. ✅ Add GitHub secrets
4. ✅ Test staging deployment
5. ✅ Verify GitHub Actions workflow
6. ✅ Document any issues or refinements needed

Once staging is working, you can test the complete GitFlow:
- Feature branch → develop → staging → production

## Security Notes

- Use separate API keys for staging vs production
- Staging should use test/sandbox modes for external services
- Never use production database connections in staging
- Monitor staging logs for any security issues
- Regular security scans on staging environment

---

**Created for BookedBarber V2 Git Workflow Setup**  
Last updated: 2025-07-14