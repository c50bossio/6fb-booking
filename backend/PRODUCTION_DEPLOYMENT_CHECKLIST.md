# 🚀 BookBarber API - Production Deployment Checklist

## Pre-Deployment Requirements

### 📋 Server Requirements
- [ ] **Server Specs**: Minimum 2GB RAM, 2 CPU cores, 20GB storage
- [ ] **Operating System**: Ubuntu 22.04 LTS (recommended)
- [ ] **Docker**: Version 20.10+ installed
- [ ] **Docker Compose**: Version 2.0+ installed
- [ ] **Domain**: `api.bookbarber.com` pointing to server IP
- [ ] **Firewall**: Ports 80, 443, 22 open

### 🔑 Required API Keys & Configuration

#### Essential (Must Have)
- [ ] **Stripe Live Keys**
  - [ ] `STRIPE_SECRET_KEY=sk_live_...`
  - [ ] `STRIPE_PUBLISHABLE_KEY=pk_live_...`
  - [ ] `STRIPE_WEBHOOK_SECRET=whsec_...`
  - [ ] `STRIPE_CONNECT_CLIENT_ID=ca_...`

- [ ] **Security Keys**
  - [ ] `SECRET_KEY` (64 characters minimum)
  - [ ] `JWT_SECRET_KEY` (64 characters minimum)

- [ ] **Database**
  - [ ] `DATABASE_URL=postgresql://...` (PostgreSQL recommended)

- [ ] **Email Service** (Choose one)
  - [ ] SendGrid: `SMTP_PASSWORD=SG.your-api-key`
  - [ ] Gmail: App Password configured
  - [ ] Mailgun: SMTP credentials
  - [ ] AWS SES: SMTP credentials

#### Optional but Recommended
- [ ] **Sentry**: `SENTRY_DSN=https://...` (Error tracking)
- [ ] **Redis**: `REDIS_URL=redis://...` (Caching)
- [ ] **Google Calendar**: OAuth credentials
- [ ] **Square**: Payment processing
- [ ] **Tremendous**: Alternative payouts

### 🔒 SSL Certificate
- [ ] **SSL Certificate Obtained**
  - [ ] Let's Encrypt (free)
  - [ ] Cloudflare (managed)
  - [ ] Custom certificate
- [ ] **Certificate Files**
  - [ ] `ssl/cert.pem` exists
  - [ ] `ssl/key.pem` exists

---

## Deployment Methods

### Method 1: One-Click Docker Deployment (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/6fb-booking.git
cd 6fb-booking/backend

# 2. Configure environment
cp .env.production .env
nano .env  # Edit with your values

# 3. Set up SSL certificates
# Option A: Let's Encrypt
certbot certonly --standalone -d api.bookbarber.com
mkdir -p ssl
cp /etc/letsencrypt/live/api.bookbarber.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/api.bookbarber.com/privkey.pem ssl/key.pem

# Option B: Self-signed (testing only)
# The start script will create these automatically

# 4. Start production services
./start-production.sh
```

### Method 2: Manual Docker Compose

```bash
# Set database password
export DB_PASSWORD="your-secure-password"

# Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Method 3: Platform-as-a-Service

#### Render.com
1. Create Web Service from GitHub repo
2. Set environment to Docker
3. Configure environment variables
4. Deploy

#### Railway
```bash
railway init
railway add postgresql
railway up
```

---

## Post-Deployment Verification

### 🔍 Health Checks
```bash
# API Health
curl https://api.bookbarber.com/health
# Expected: {"status": "healthy"}

# Database Connection
curl https://api.bookbarber.com/api/v1/health/database
# Expected: {"database": "connected"}

# Email Service
curl -X POST https://api.bookbarber.com/api/v1/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: {"message": "Email sent successfully"}
```

### 🧪 Functionality Tests
- [ ] **Authentication**
  ```bash
  curl -X POST https://api.bookbarber.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@example.com", "password": "password"}'
  ```

- [ ] **Booking System**
  ```bash
  curl https://api.bookbarber.com/api/v1/services
  # Should return list of services
  ```

- [ ] **Payment Processing**
  ```bash
  curl https://api.bookbarber.com/api/v1/payment/methods
  # Should return available payment methods
  ```

### 📊 Performance Verification
- [ ] **Response Times**: < 500ms for most endpoints
- [ ] **Memory Usage**: < 80% of available RAM
- [ ] **Disk Usage**: < 80% of available storage
- [ ] **SSL Certificate**: Valid and trusted

---

## Configuration Steps

### 1. Stripe Webhook Configuration
After deployment, configure Stripe webhooks:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.bookbarber.com/api/v1/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `connect.account.updated`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`
5. Restart API: `docker-compose -f docker-compose.prod.yml restart api`

### 2. Email Configuration Testing
```bash
# Test email sending
docker-compose -f docker-compose.prod.yml exec api python -c "
from services.email_service import EmailService
service = EmailService()
result = service.send_test_email('your-email@example.com')
print(f'Email test result: {result}')
"
```

### 3. Database Migration Verification
```bash
# Check current migration status
docker-compose -f docker-compose.prod.yml exec api alembic current

# Apply any pending migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head
```

---

## Monitoring & Maintenance

### 📈 Monitoring Setup
- [ ] **Log Aggregation**: Centralized logging configured
- [ ] **Error Tracking**: Sentry or similar service
- [ ] **Uptime Monitoring**: External monitoring service
- [ ] **Performance Metrics**: APM tool configured

### 🔄 Backup Strategy
```bash
# Daily database backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump \
  -U bookbarber_user 6fb_booking_prod > backup_$(date +%Y%m%d).sql

# Weekly full backup
tar -czf backup_full_$(date +%Y%m%d).tar.gz \
  .env docker-compose.prod.yml ssl/ logs/ uploads/
```

### 🚨 Alerting
- [ ] **Server Resources**: CPU, Memory, Disk alerts
- [ ] **Application Errors**: 500 errors, exceptions
- [ ] **Database**: Connection failures, slow queries
- [ ] **SSL Certificate**: Expiry alerts

---

## Security Checklist

### 🔐 Application Security
- [ ] **Environment Variables**: Secure secrets, no hardcoding
- [ ] **HTTPS**: All traffic encrypted
- [ ] **Authentication**: JWT with secure secret keys
- [ ] **Authorization**: Role-based access control
- [ ] **Input Validation**: All inputs sanitized
- [ ] **Rate Limiting**: API endpoints protected

### 🛡️ Infrastructure Security
- [ ] **Firewall**: Only necessary ports open
- [ ] **SSH**: Key-based authentication only
- [ ] **Database**: Not publicly accessible
- [ ] **Updates**: System packages up to date
- [ ] **Backup**: Encrypted and secure storage

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 🔧 API Not Responding
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check API logs
docker-compose -f docker-compose.prod.yml logs -f api

# Restart API
docker-compose -f docker-compose.prod.yml restart api
```

#### 🔧 Database Connection Failed
```bash
# Check database container
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Connect to database manually
docker-compose -f docker-compose.prod.yml exec db psql -U bookbarber_user -d 6fb_booking_prod
```

#### 🔧 SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Renew Let's Encrypt certificate
certbot renew
```

#### 🔧 High Memory Usage
```bash
# Check container resource usage
docker stats

# Reduce worker count
# Edit docker-compose.prod.yml: --workers 2
```

---

## Deployment Completion

### ✅ Final Checklist
- [ ] **All services running**: Database, Redis, API, Nginx
- [ ] **Health checks passing**: /health endpoint returns 200
- [ ] **SSL certificate valid**: HTTPS working without warnings
- [ ] **Authentication working**: Login endpoint functional
- [ ] **Database migrations applied**: All tables created
- [ ] **Email service configured**: Test email sent successfully
- [ ] **Stripe webhooks configured**: Webhook endpoint active
- [ ] **Monitoring enabled**: Logs and metrics collected
- [ ] **Backups scheduled**: Automated backup script running
- [ ] **Documentation updated**: API docs accessible

### 🎉 Go-Live Verification
1. **API Documentation**: https://api.bookbarber.com/docs
2. **Health Check**: https://api.bookbarber.com/health
3. **Authentication**: Test login/logout flow
4. **Payment Flow**: Test Stripe integration
5. **Email Notifications**: Verify email sending
6. **Performance**: Response times under 500ms

---

## Support & Maintenance Schedule

### 📅 Regular Maintenance
- **Daily**: Check logs and health status
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization review
- **Annually**: SSL certificate renewal, security audit

### 🆘 Emergency Response
- **API Down**: Restart containers, check logs
- **Database Issues**: Check connection, restore from backup
- **SSL Expiry**: Renew certificate, restart nginx
- **High Load**: Scale horizontally, optimize queries

---

**🚀 Production Deployment Complete!**

Your BookBarber API is now live at `https://api.bookbarber.com`

For support, check the logs first:
```bash
docker-compose -f docker-compose.prod.yml logs -f api
```