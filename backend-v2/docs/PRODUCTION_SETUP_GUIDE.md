# Production Setup Guide - BookedBarber V2

## Overview
This guide walks through setting up BookedBarber V2 for production deployment. Follow each step carefully to ensure a secure and reliable deployment.

## Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+
- Redis (optional but recommended)
- Domain names for frontend and API

## Step 1: Generate Security Keys

```bash
cd backend-v2
python generate_production_keys.py
```

This creates a file with secure keys. Copy these values - you'll need them for Step 2.

## Step 2: Configure Environment Variables

### Backend Configuration

1. Copy the template:
```bash
cp .env.production.example .env.production
```

2. Fill in all REQUIRED values:
- **Security Keys**: From Step 1
- **Database URL**: Your PostgreSQL connection string
- **Stripe Keys**: From dashboard.stripe.com
- **SendGrid API Key**: From app.sendgrid.com
- **Twilio Credentials**: From console.twilio.com

### Frontend Configuration

```bash
cd frontend-v2
cp .env.production.example .env.production
```

Required values:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: From Stripe dashboard

## Step 3: Set Up External Services

### PostgreSQL Database

1. Create database:
```sql
CREATE DATABASE bookedbarber_production;
CREATE USER bookedbarber_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bookedbarber_production TO bookedbarber_user;
```

2. Run migrations:
```bash
DATABASE_URL="postgresql://..." alembic upgrade head
```

### Stripe Configuration

1. Log into dashboard.stripe.com
2. Switch to live mode
3. Copy API keys to .env.production
4. Set up webhook endpoint:
   - URL: `https://api.yourdomain.com/api/v1/webhooks/stripe`
   - Events: payment_intent.succeeded, payment_intent.failed

### SendGrid Setup

1. Create API key at app.sendgrid.com
2. Verify sender domain
3. Set up email templates (optional)

### Twilio Setup

1. Get credentials from console.twilio.com
2. Purchase phone number
3. Configure messaging service

## Step 4: Deploy Application

### Option A: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway link
railway up
```

### Option B: Render

1. Connect GitHub repository
2. Create Web Service for backend
3. Create Static Site for frontend
4. Add environment variables in dashboard

### Option C: Docker

```bash
# Build and run
docker-compose -f docker-compose.production.yml up -d
```

## Step 5: Post-Deployment Tasks

### 1. Verify Services

```bash
# Check API health
curl https://api.yourdomain.com/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### 2. Set Up Monitoring

- Configure Sentry for error tracking
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure log aggregation

### 3. Security Hardening

- Enable HTTPS everywhere
- Set up WAF (Web Application Firewall)
- Configure DDoS protection
- Regular security updates

### 4. Backup Strategy

```bash
# Database backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated daily backups
0 2 * * * /path/to/backup_script.sh
```

## Production Checklist

### Critical Items ✅
- [ ] All environment variables configured
- [ ] Database migrated and accessible
- [ ] Stripe webhook configured and tested
- [ ] Email sending verified
- [ ] SMS sending verified
- [ ] HTTPS enabled on all endpoints
- [ ] Error tracking active (Sentry)
- [ ] Automated backups configured
- [ ] Health checks passing
- [ ] Rate limiting enabled

### Recommended Items 📋
- [ ] Redis cache configured
- [ ] CDN for static assets
- [ ] Performance monitoring
- [ ] Log aggregation
- [ ] A/B testing framework
- [ ] Feature flags system
- [ ] Staging environment
- [ ] CI/CD pipeline
- [ ] Disaster recovery plan
- [ ] Security audit completed

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check firewall rules
# Ensure database allows connections from app servers
```

### Email Not Sending
1. Verify SendGrid API key
2. Check sender verification
3. Review SendGrid activity logs
4. Test with curl:
```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
```

### Performance Issues
1. Enable Redis caching
2. Add database indexes
3. Implement CDN
4. Scale worker processes
5. Monitor with APM tools

## Support

For deployment issues:
1. Check logs in your deployment platform
2. Review error tracking in Sentry
3. Consult deployment platform documentation
4. Contact support with detailed error messages

## Security Reminders

⚠️ **NEVER**:
- Commit .env files
- Share production keys
- Use debug mode in production
- Disable HTTPS
- Skip security updates

🔒 **ALWAYS**:
- Rotate keys regularly
- Monitor for vulnerabilities
- Keep dependencies updated
- Review access logs
- Plan for disaster recovery