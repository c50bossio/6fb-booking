# Production Environment Setup Guide

## 🔧 Environment Variables That Need Configuration

Your `.env.production` file has been created with secure keys, but you'll need to replace the following placeholder values with actual credentials:

### 🗄️ Database Configuration
```env
# Replace with your DigitalOcean Managed Database connection string
DATABASE_URL=postgresql://doadmin:GENERATED_PASSWORD@db-postgresql-nyc1-12345-do-user-1234567-0.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

### 💳 Stripe Configuration (CRITICAL)
```env
# Replace with your LIVE Stripe keys from https://dashboard.stripe.com/
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
STRIPE_CONNECT_CLIENT_ID=ca_YOUR_STRIPE_CONNECT_CLIENT_ID
```

### 📧 Email Service Configuration
```env
# Option 1: SendGrid (Recommended)
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@yourdomain.com

# Option 2: SMTP Alternative
SMTP_SERVER=smtp.your-provider.com
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

### 🌐 Domain Configuration
```env
# Replace with your actual domain
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 📊 Monitoring Services
```env
# Sentry for error tracking
SENTRY_DSN=https://YOUR_SENTRY_KEY@YOUR_SENTRY_SUBDOMAIN.ingest.sentry.io/YOUR_PROJECT_ID

# Google Analytics (optional)
GA_TRACKING_ID=G-YOUR_GA4_TRACKING_ID

# UptimeRobot (optional)
UPTIME_ROBOT_API_KEY=YOUR_UPTIME_ROBOT_API_KEY
```

### ☁️ DigitalOcean Spaces (Optional)
```env
# For file uploads and backups
DO_SPACES_KEY=YOUR_DO_SPACES_KEY
DO_SPACES_SECRET=YOUR_DO_SPACES_SECRET
DO_SPACES_BUCKET=your-spaces-bucket
DO_SPACES_REGION=nyc3
```

### 🔐 Redis Configuration
```env
# If using DigitalOcean Managed Redis
REDIS_URL=rediss://default:YOUR_REDIS_PASSWORD@redis-cluster-nyc1-12345-do-user-1234567-0.b.db.ondigitalocean.com:25061/0
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
```

### 💼 Business Information
```env
# Update with your business details
PLATFORM_NAME=Your Business Name
SUPPORT_EMAIL=support@yourdomain.com
BUSINESS_PHONE=+1-XXX-XXX-XXXX
BUSINESS_ADDRESS=Your Business Address
```

## 🚀 Quick Setup Commands

### 1. Validate Configuration
```bash
# Run this after updating all placeholder values
python validate-production-env.py
```

### 2. Generate Additional Secure Keys (if needed)
```bash
# Generate additional secure keys
python3 -c 'import secrets; print("New secure key:", secrets.token_urlsafe(64))'
```

### 3. Test Database Connection
```bash
# After updating DATABASE_URL, test the connection
cd backend
python -c "
from config.database import check_database_health
result = check_database_health()
print('Database health:', result)
"
```

## 📋 Service Setup Order

1. **DigitalOcean Resources**
   - Create Droplet
   - Create Managed Database
   - Create Redis (optional)
   - Create Spaces bucket (optional)

2. **External Services**
   - Set up Stripe account and get live keys
   - Configure SendGrid or email service
   - Set up Sentry for monitoring
   - Configure domain DNS

3. **Update Environment**
   - Replace all placeholder values
   - Run validation script
   - Test configurations

4. **Deploy Application**
   - Follow DigitalOcean deployment checklist
   - Configure SSL certificates
   - Set up monitoring

## ⚠️ Security Reminders

- ✅ **Generated Keys**: Your SECRET_KEY and JWT_SECRET_KEY are already securely generated
- ⚠️ **Stripe Keys**: Make sure to use LIVE keys (sk_live_*, pk_live_*) for production
- ⚠️ **Database**: Use PostgreSQL, not SQLite, for production
- ⚠️ **Email**: Configure proper email service for notifications
- ⚠️ **Monitoring**: Set up Sentry for error tracking
- ⚠️ **SSL**: Ensure HTTPS is enabled for all domains

## 🔍 Validation Checklist

Run these commands to ensure everything is configured correctly:

```bash
# 1. Validate environment
python validate-production-env.py

# 2. Test database connection
cd backend && python -c "from config.database import check_database_health; print(check_database_health())"

# 3. Test Stripe configuration
cd backend && python -c "from config.settings import settings; print('Stripe configured:', bool(settings.STRIPE_SECRET_KEY))"

# 4. Test email configuration
cd backend && python -c "from services.email_service import EmailService; print('Email service configured')"
```

## 🎯 Ready for Deployment

Once all placeholder values are replaced and validation passes, you're ready to deploy to DigitalOcean using the deployment checklist!