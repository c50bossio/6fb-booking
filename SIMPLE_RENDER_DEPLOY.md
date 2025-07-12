# 🚀 6FB Booking V2 - Render Deployment Guide

## ✅ Current Working Staging Environment

Your staging environment is now live and working:

- **Backend**: https://sixfb-backend-v2-staging.onrender.com
- **Frontend**: https://sixfb-frontend-v2-staging.onrender.com  
- **Database**: 6fb-database (PostgreSQL 16)
- **API Docs**: https://sixfb-backend-v2-staging.onrender.com/docs

## 🎯 Production Deployment (When Ready)

### Step 1: Create Production Backend Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. **Public Git repository**: `https://github.com/c50bossio/6fb-booking`
4. **Name**: `sixfb-backend-v2-production`
5. **Environment**: Python 3
6. **Branch**: `main`
7. **Root Directory**: `backend-v2`
8. **Build Command**: `pip install -r requirements.txt`
9. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 2: Production Backend Environment Variables
```
STRIPE_SECRET_KEY = [your live key]
STRIPE_PUBLISHABLE_KEY = [your live key]
STRIPE_WEBHOOK_SECRET = [your webhook secret]
STRIPE_CONNECT_CLIENT_ID = [your connect ID]
SENDGRID_API_KEY = [your sendgrid key]
SENDGRID_FROM_EMAIL = noreply@bookedbarber.com
TWILIO_ACCOUNT_SID = [your sid]
TWILIO_AUTH_TOKEN = [your auth token]
TWILIO_PHONE_NUMBER = [your phone]
SECRET_KEY = [from your .env]
JWT_SECRET_KEY = [from your .env]
ENVIRONMENT = production
CORS_ALLOWED_ORIGINS = https://sixfb-frontend-v2-production.onrender.com
DATABASE_URL = [production postgresql url]
```

### Step 3: Create Production Frontend Service
1. Click "New +" → "Web Service"
2. **Public Git repository**: `https://github.com/c50bossio/6fb-booking`
3. **Name**: `sixfb-frontend-v2-production`
4. **Environment**: Node
5. **Branch**: `main`
6. **Root Directory**: `backend-v2/frontend-v2`
7. **Build Command**: `npm ci && npm run build`
8. **Start Command**: `npm start`

### Step 4: Production Frontend Environment Variables
```
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://sixfb-backend-v2-production.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = [your live publishable key]
```

## 🗂️ Service Organization

### Current Services (3 total):
- ✅ **sixfb-backend-v2-staging** - Staging backend
- ✅ **sixfb-frontend-v2-staging** - Staging frontend
- ✅ **6fb-database** - PostgreSQL 16 database

### When Production is Ready (6 total):
- **sixfb-backend-v2-staging** - Staging backend
- **sixfb-frontend-v2-staging** - Staging frontend
- **sixfb-backend-v2-production** - Production backend
- **sixfb-frontend-v2-production** - Production frontend
- **6fb-database** - Staging database
- **6fb-database-production** - Production database

## 🧪 Testing Your Staging Environment

### Backend Health Check:
```bash
curl https://sixfb-backend-v2-staging.onrender.com/health
# Expected: {"status":"healthy","service":"BookedBarber API"}
```

### Frontend:
Open https://sixfb-frontend-v2-staging.onrender.com in your browser

### API Documentation:
Open https://sixfb-backend-v2-staging.onrender.com/docs

## 💰 Cost Optimization Achieved

- **Before cleanup**: 8 services (~$60-120/month)
- **After cleanup**: 3 services (~$25-50/month)
- **Monthly savings**: $35-70

## 📋 Next Steps

1. **Test staging thoroughly** - Verify all features work
2. **Update custom domain** (if applicable) to point to staging
3. **Plan production deployment** when ready
4. **Set up monitoring** and alerts
5. **Configure backups** for production database

## 🔧 Quick Commands for Development

```bash
# Check staging backend health
curl https://sixfb-backend-v2-staging.onrender.com/health

# Test API endpoints
curl https://sixfb-backend-v2-staging.onrender.com/api/v1/bookings

# View real-time logs (in Render dashboard)
# Services → sixfb-backend-v2-staging → Logs
# Services → sixfb-frontend-v2-staging → Logs
```

## 🚨 Important Notes

- **Environment**: Currently using staging environment variables
- **Database**: Using shared staging database
- **Keys**: Using live Stripe keys (be careful with test transactions)
- **CORS**: Configured for staging frontend URL
- **Branch**: Deploying from `deployment-clean` branch

## 🎯 Production Readiness Checklist

- [ ] Test all booking flows in staging
- [ ] Verify payment processing works
- [ ] Test email/SMS notifications
- [ ] Configure production database
- [ ] Set up domain and SSL certificates
- [ ] Configure monitoring and alerts
- [ ] Plan backup and recovery procedures
- [ ] Update documentation for production URLs