# 🌍 Environment Configuration Guide

## 📋 Environment Overview

6FB Booking V2 uses three distinct environments with different configurations:

| Environment | Purpose | Branch | Auto-Deploy |
|-------------|---------|--------|-------------|
| **Local** | Development & Testing | any | N/A |
| **Staging** | Integration Testing | `deployment-clean` | ✅ Enabled |
| **Production** | Live Application | `main` | Manual only |

## 🔧 Local Development Environment

### **File Locations:**
```
backend-v2/.env                    # Backend configuration
backend-v2/frontend-v2/.env.local  # Frontend configuration
```

### **Backend Environment (.env):**
```bash
# Core settings
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite:///./6fb_booking.db

# API URLs
ALLOWED_ORIGINS=http://localhost:3000

# Keys (use test keys for local development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# External services
SENDGRID_API_KEY=[your key]
TWILIO_ACCOUNT_SID=[your sid]
TWILIO_AUTH_TOKEN=[your token]
```

### **Frontend Environment (.env.local):**
```bash
# Environment
NODE_ENV=development

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (use test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Features
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### **Local URLs:**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🧪 Staging Environment

### **Render Environment Variables:**

#### **Backend Service (sixfb-backend-v2-staging):**
```bash
# Core settings
ENVIRONMENT=staging
DEBUG=false
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://[render-provided-url]

# CORS
ALLOWED_ORIGINS=https://sixfb-frontend-v2-staging.onrender.com

# Stripe (can use live or test keys)
STRIPE_SECRET_KEY=sk_live_... # or sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Authentication
SECRET_KEY=[your-secret-key]
JWT_SECRET_KEY=[your-jwt-key]

# Email/SMS
SENDGRID_API_KEY=[your-key]
SENDGRID_FROM_EMAIL=noreply@bookedbarber.com
TWILIO_ACCOUNT_SID=[your-sid]
TWILIO_AUTH_TOKEN=[your-token]
TWILIO_PHONE_NUMBER=[your-number]
```

#### **Frontend Service (sixfb-frontend-v2-staging):**
```bash
# Environment
NODE_ENV=production
BUILD_ENV=staging

# API Configuration
NEXT_PUBLIC_API_URL=https://sixfb-backend-v2-staging.onrender.com
NEXT_PUBLIC_APP_URL=https://sixfb-frontend-v2-staging.onrender.com

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...

# Features
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### **Staging URLs:**
- **Frontend**: https://sixfb-frontend-v2-staging.onrender.com
- **Backend**: https://sixfb-backend-v2-staging.onrender.com
- **API Docs**: https://sixfb-backend-v2-staging.onrender.com/docs
- **Health Check**: https://sixfb-backend-v2-staging.onrender.com/health

## 🚀 Production Environment (When Ready)

### **Backend Service (sixfb-backend-v2-production):**
```bash
# Core settings
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING

# Database
DATABASE_URL=postgresql://[production-db-url]

# CORS
ALLOWED_ORIGINS=https://app.bookedbarber.com,https://bookedbarber.com

# Stripe (LIVE KEYS ONLY)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Authentication (UNIQUE PRODUCTION KEYS)
SECRET_KEY=[unique-production-secret]
JWT_SECRET_KEY=[unique-production-jwt]

# Email/SMS (Production credentials)
SENDGRID_API_KEY=[production-key]
SENDGRID_FROM_EMAIL=noreply@bookedbarber.com
TWILIO_ACCOUNT_SID=[production-sid]
TWILIO_AUTH_TOKEN=[production-token]
TWILIO_PHONE_NUMBER=[production-number]

# Security
SECURE_SSL_REDIRECT=true
SECURE_HSTS_SECONDS=31536000
```

### **Frontend Service (sixfb-frontend-v2-production):**
```bash
# Environment
NODE_ENV=production
BUILD_ENV=production

# API Configuration
NEXT_PUBLIC_API_URL=https://api.bookedbarber.com
NEXT_PUBLIC_APP_URL=https://app.bookedbarber.com

# Stripe (LIVE KEYS ONLY)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Features
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_USE_MOCK_DATA=false

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
NEXT_PUBLIC_GTM_ID=GTM-...
```

## 🔄 Environment Switching

### **Switching Local to Staging:**
When you run `./deploy-to-staging.sh`, the environment automatically switches:

| Component | Local | → | Staging |
|-----------|-------|---|---------|
| API calls | `localhost:8000` | → | `sixfb-backend-v2-staging.onrender.com` |
| Database | SQLite | → | PostgreSQL |
| CORS | `localhost:3000` | → | `sixfb-frontend-v2-staging.onrender.com` |
| Environment | `development` | → | `staging` |

### **Manual Environment Variable Updates:**
If you need to update staging environment variables:

1. **Go to Render Dashboard**
2. **Select your service** (backend or frontend)
3. **Environment tab**
4. **Add/Update variables**
5. **Deploy** (triggers automatic redeploy)

## 🔐 Security Considerations

### **Local Development:**
- ✅ Use test Stripe keys
- ✅ SQLite database (disposable)
- ✅ Debug mode enabled
- ⚠️ Never commit .env files

### **Staging:**
- ⚠️ Can use live or test Stripe keys (be careful!)
- ✅ Separate PostgreSQL database
- ✅ Production-like security
- ✅ Environment variables in Render (not in code)

### **Production:**
- 🔒 Live Stripe keys only
- 🔒 Unique security keys
- 🔒 SSL/HTTPS enforced
- 🔒 Enhanced logging and monitoring

## 🧪 Testing Different Environments

### **Test API Connections:**
```bash
# Local
curl http://localhost:8000/health

# Staging
curl https://sixfb-backend-v2-staging.onrender.com/health

# Production (when ready)
curl https://api.bookedbarber.com/health
```

### **Test Frontend Loading:**
```bash
# Local
curl http://localhost:3000

# Staging
curl https://sixfb-frontend-v2-staging.onrender.com

# Production (when ready)
curl https://app.bookedbarber.com
```

## 📊 Environment Variable Checklist

### **Before Deploying to Staging:**
- [ ] Backend CORS allows staging frontend URL
- [ ] Frontend API URL points to staging backend
- [ ] Database URL is PostgreSQL (not SQLite)
- [ ] Stripe keys are appropriate for testing
- [ ] All external service keys are configured

### **Before Deploying to Production:**
- [ ] All secrets are unique (not copied from staging)
- [ ] Live Stripe keys configured
- [ ] Production domain names configured
- [ ] SSL/security settings enabled
- [ ] Analytics and monitoring configured
- [ ] Database backups configured

## 🚨 Common Environment Issues

### **CORS Errors:**
```
❌ Access to fetch at 'backend-url' from origin 'frontend-url' has been blocked by CORS policy
```
**Fix:** Update `ALLOWED_ORIGINS` in backend environment variables

### **API Connection Errors:**
```
❌ Failed to fetch from http://localhost:8000 (in staging)
```
**Fix:** Update `NEXT_PUBLIC_API_URL` in frontend environment variables

### **Database Connection Errors:**
```
❌ sqlite3.OperationalError: unable to open database file (in staging)
```
**Fix:** Update `DATABASE_URL` to PostgreSQL URL

### **Stripe Key Errors:**
```
❌ No such API key: pk_test_... (in production)
```
**Fix:** Use live Stripe keys in production environment

## 💡 Best Practices

1. **Keep environments isolated** - Don't mix staging and production data
2. **Use appropriate keys** - Test keys for staging, live keys for production
3. **Document changes** - Update this guide when adding new environment variables
4. **Test thoroughly** - Verify each environment works independently
5. **Rotate secrets** - Change production secrets quarterly
6. **Monitor usage** - Track API calls and costs across environments

---

**🔧 Need to update environment variables? Use the Render dashboard or contact Claude for assistance!**