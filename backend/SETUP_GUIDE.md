# 🚀 6FB Automated Payout Setup Guide

This guide will help you configure the automated payout system for production use.

## 📋 Prerequisites

- Python 3.8+
- Stripe account with Connect enabled
- Email provider (Gmail, SendGrid, etc.)
- Domain name (for production)

## 🔧 Step 1: Environment Configuration

### Copy the template file:
```bash
cp .env.template .env
```

### Edit the .env file with your actual credentials:
```bash
nano .env  # or use your preferred editor
```

## 📧 Step 2: Email Configuration (Choose One)

### Option A: Gmail (Easy setup for testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update .env**:
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-16-digit-app-password
   FROM_EMAIL=your-email@gmail.com
   ```

### Option B: SendGrid (Recommended for production)

1. **Create SendGrid account** at sendgrid.com
2. **Generate API key**:
   - Settings → API Keys → Create API Key
   - Choose "Full Access" or "Restricted Access" with Mail Send permissions
3. **Update .env**:
   ```env
   SMTP_SERVER=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=SG.your-api-key-here
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Option C: Mailgun

1. **Create Mailgun account** at mailgun.com
2. **Add your domain** and verify it
3. **Get SMTP credentials** from domain settings
4. **Update .env**:
   ```env
   SMTP_SERVER=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USERNAME=postmaster@mg.yourdomain.com
   SMTP_PASSWORD=your-mailgun-password
   FROM_EMAIL=noreply@yourdomain.com
   ```

## 💳 Step 3: Stripe Connect Configuration

### 3.1 Stripe Account Setup

1. **Create/Login to Stripe Dashboard**: https://dashboard.stripe.com
2. **Enable Connect**:
   - Go to Connect → Get started
   - Choose "Platform or marketplace"
   - Complete the setup process

### 3.2 Get Stripe Credentials

1. **API Keys** (Developers → API keys):
   ```env
   STRIPE_SECRET_KEY=sk_test_51ABC...  # Use sk_live_ for production
   STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...  # Use pk_live_ for production
   ```

2. **Connect Client ID** (Connect → Settings):
   ```env
   STRIPE_CONNECT_CLIENT_ID=ca_ABC123...
   ```

3. **Webhook Endpoints** (Developers → Webhooks):
   - Add endpoint: `https://yourdomain.com/api/v1/webhooks/stripe`
   - Select events: `account.updated`, `payout.created`, `payout.paid`, `payout.failed`
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_ABC123...
   ```

### 3.3 Connect Settings

In Stripe Connect settings, configure:
- **Branding**: Add your logo and colors
- **OAuth settings**:
  - Redirect URI: `https://yourdomain.com/api/v1/stripe/oauth/callback`
- **Application details**: Fill in your business information

## 🔐 Step 4: Security Configuration

### Generate a secure JWT secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add to .env:
```env
SECRET_KEY=your-generated-secret-key-here
```

## 🗄️ Step 5: Database Setup

### For SQLite (Development):
```env
DATABASE_URL=sqlite:///./6fb_booking.db
```

### For PostgreSQL (Production):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/6fb_booking
```

## 🚀 Step 6: Application Startup

### Install dependencies:
```bash
pip install -r requirements.txt
```

### Run database migrations:
```bash
python -c "
from config.database import engine, Base
from models import *
Base.metadata.create_all(bind=engine)
print('Database tables created successfully!')
"
```

### Start the application:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🧪 Step 7: Test the Setup

### 7.1 Test Email Configuration
```bash
curl -X POST "http://localhost:8000/api/v1/test-payout/test-email" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'
```

### 7.2 Test Payout System
1. **Create a test barber** with Stripe Connect
2. **Create a compensation plan** with automated payouts
3. **Generate test commissions**
4. **Trigger test payout**

## 📊 Step 8: Monitoring & Logs

### Check scheduler status:
```bash
curl -X GET "http://localhost:8000/api/v1/test-payout/scheduler-status"
```

### Monitor logs:
```bash
tail -f backend.log
```

## 🔧 Production Deployment

### Environment Variables for Production:
```env
ENVIRONMENT=production
DEBUG=false
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Recommended Production Setup:
- **Reverse Proxy**: Nginx or Cloudflare
- **Process Manager**: PM2 or systemd
- **Database**: PostgreSQL with connection pooling
- **Monitoring**: Sentry for error tracking
- **SSL Certificate**: Let's Encrypt or Cloudflare

### Sample Nginx Configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Sample PM2 Configuration:
```json
{
  "apps": [{
    "name": "6fb-api",
    "script": "uvicorn",
    "args": "main:app --host 0.0.0.0 --port 8000",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production"
    }
  }]
}
```

## 🆘 Troubleshooting

### Common Issues:

1. **SMTP Authentication Failed**
   - Double-check username/password
   - Ensure 2FA and app passwords are set up correctly
   - Try different SMTP ports (587, 465, 25)

2. **Stripe Connect Issues**
   - Verify webhook endpoints are accessible
   - Check Connect application is approved
   - Ensure all required business information is provided

3. **Payout Failures**
   - Check Stripe Connect account status
   - Verify bank account information
   - Review hold periods and minimum amounts

4. **Scheduler Not Running**
   - Check application logs for errors
   - Verify database permissions
   - Ensure no firewall blocking

### Getting Help:
- Check logs in `backend.log`
- Use test endpoints to debug issues
- Review Stripe Dashboard for Connect status
- Monitor webhook delivery success

## ✅ Success Checklist

- [ ] Email notifications working
- [ ] Stripe Connect configured
- [ ] Test payout successful
- [ ] Scheduler running
- [ ] Production environment configured
- [ ] SSL certificate installed
- [ ] Monitoring set up

Your automated payout system is now ready for production! 🎉
