# 6FB Booking Platform - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the 6FB Booking Platform to production with zero downtime, comprehensive monitoring, and robust security measures.

## Prerequisites

### System Requirements
- Docker 20.10+ and Docker Compose v2.0+
- Linux server with minimum 4GB RAM, 2 CPU cores
- 50GB+ available disk space
- Root or sudo access
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

### Required Services
- PostgreSQL 15+ (managed or self-hosted)
- Redis 7+ for caching and sessions
- SMTP service (SendGrid recommended)
- SMS service (Twilio recommended)
- Monitoring service (optional but recommended)

## Step 1: Environment Setup

### 1.1 Clone and Prepare Repository
```bash
# Clone the repository
git clone <your-repo-url> /opt/6fb-booking
cd /opt/6fb-booking

# Checkout the main branch
git checkout main

# Make scripts executable
chmod +x scripts/*.sh
```

### 1.2 Configure Production Environment Variables

Copy and customize the production environment files:

```bash
# Backend environment
cp backend-v2/.env.production backend-v2/.env.production.local

# Frontend environment
cp backend-v2/frontend-v2/.env.production backend-v2/frontend-v2/.env.production.local
```

**CRITICAL: Update all placeholder values in the environment files:**

#### Backend Environment (.env.production.local)
```bash
# Generate secure keys
python scripts/generate_secret_key.py

# Update these values:
SECRET_KEY=your_generated_secret_key_32_chars_min
JWT_SECRET_KEY=your_generated_jwt_secret_key_32_chars_min
DATABASE_URL=postgresql://username:password@host:5432/6fb_booking_prod
REDIS_URL=redis://your_redis_host:6379/0

# Stripe LIVE keys (CRITICAL)
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Communication services
SENDGRID_API_KEY=SG.your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Domain configuration
FRONTEND_URL=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

#### Frontend Environment (.env.production.local)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1

# Stripe configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key

# NextAuth configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min

# Google OAuth (production)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id
```

### 1.3 SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chown $(whoami):$(whoami) nginx/ssl/*
```

#### Option B: Custom SSL Certificate
```bash
# Copy your SSL files
cp your-certificate.crt nginx/ssl/fullchain.pem
cp your-private-key.key nginx/ssl/privkey.pem
```

## Step 2: Pre-Deployment Validation

### 2.1 Environment Validation
```bash
# Validate environment configuration
./scripts/validate-production-env.sh

# Check production readiness
./scripts/production-readiness-check.sh
```

### 2.2 Database Setup
```bash
# Setup production database
./scripts/setup-production-database.py

# Verify database connection
docker-compose -f docker-compose.prod.yml run --rm backend alembic check
```

### 2.3 Security Validation
```bash
# Run security audit
./scripts/security-audit.sh

# Validate SSL configuration
./scripts/validate-ssl-config.sh
```

## Step 3: Production Deployment

### 3.1 Build and Deploy
```bash
# Load production environment
export $(cat .env.production.local | xargs)

# Run the production deployment script
./scripts/deploy-production.sh
```

### 3.2 Manual Deployment Steps (if automated script fails)

```bash
# 1. Stop existing services
docker-compose -f docker-compose.prod.yml down

# 2. Build new images
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Run database migrations
docker exec 6fb-backend alembic upgrade head

# 5. Verify deployment
./scripts/health-check-production.sh
```

## Step 4: Post-Deployment Verification

### 4.1 Service Health Checks
```bash
# Comprehensive health check
./scripts/health-check-production.sh

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4.2 Critical Functionality Tests

#### Test 1: API Health
```bash
curl -f https://your-domain.com/api/v1/health
```

#### Test 2: Authentication
```bash
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"invalid"}'
# Should return 401 or 422
```

#### Test 3: Frontend Access
```bash
curl -f https://your-domain.com/
```

#### Test 4: Database Connectivity
```bash
docker exec 6fb-backend python -c "
from database import get_db
from sqlalchemy import text
db = next(get_db())
result = db.execute(text('SELECT 1')).fetchone()
print('Database OK' if result else 'Database FAIL')
"
```

### 4.3 Performance Validation
```bash
# Check response times
./scripts/performance-check.sh

# Monitor resource usage
docker stats
```

## Step 5: Monitoring Setup

### 5.1 Application Monitoring
```bash
# Start monitoring services
docker-compose -f docker-compose.prod.yml up -d prometheus grafana

# Access Grafana dashboard
# URL: https://your-domain.com:3001
# Default login: admin / [GRAFANA_PASSWORD from environment]
```

### 5.2 Uptime Monitoring
```bash
# Configure external uptime monitoring
./scripts/setup-uptime-monitoring.sh
```

### 5.3 Error Tracking (Sentry)
```bash
# Verify Sentry integration
curl -X POST https://your-domain.com/api/v1/test-sentry
```

## Step 6: Backup Configuration

### 6.1 Automated Backups
```bash
# Setup automated backups
./scripts/setup-automated-backups.sh

# Test backup creation
./scripts/backup.sh
```

### 6.2 Backup Verification
```bash
# Verify backup integrity
./scripts/verify-backup.sh
```

## Step 7: Security Hardening

### 7.1 Network Security
```bash
# Configure firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# Close unnecessary ports
sudo ufw deny 5432   # PostgreSQL (use internal network only)
sudo ufw deny 6379   # Redis (use internal network only)
```

### 7.2 Container Security
```bash
# Run security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/src aquasec/trivy fs /src
```

## Environment Variables Checklist

### Critical Production Variables (Must Be Set)

#### Backend
- [ ] `SECRET_KEY` (32+ characters)
- [ ] `JWT_SECRET_KEY` (32+ characters)
- [ ] `DATABASE_URL` (production database)
- [ ] `STRIPE_SECRET_KEY` (sk_live_...)
- [ ] `STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- [ ] `STRIPE_WEBHOOK_SECRET` (whsec_...)
- [ ] `SENDGRID_API_KEY`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `REDIS_URL`
- [ ] `FRONTEND_URL`
- [ ] `CORS_ALLOWED_ORIGINS`

#### Frontend
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

#### Infrastructure
- [ ] `POSTGRES_DB`
- [ ] `POSTGRES_USER`
- [ ] `POSTGRES_PASSWORD`
- [ ] `REDIS_PASSWORD`
- [ ] `GRAFANA_PASSWORD`

### Optional but Recommended
- [ ] `SENTRY_DSN` (error tracking)
- [ ] `GOOGLE_ANALYTICS_ID` (analytics)
- [ ] `BACKUP_S3_BUCKET` (cloud backups)

## Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check environment variables
./scripts/validate-production-env.sh

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

#### 2. Database Connection Issues
```bash
# Check database status
docker exec 6fb-postgres pg_isready

# Test connection
docker exec 6fb-backend python -c "
from sqlalchemy import create_engine
engine = create_engine('$DATABASE_URL')
conn = engine.connect()
print('Connected!')
"
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

#### 4. High Memory Usage
```bash
# Check container resource usage
docker stats

# Restart services to clear memory
docker-compose -f docker-compose.prod.yml restart
```

### Emergency Procedures

#### Immediate Rollback
```bash
# Emergency rollback to previous version
./scripts/rollback.sh

# Or manual rollback
git checkout [previous-stable-tag]
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

#### Service Recovery
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check health status: `./scripts/health-check-production.sh`
- [ ] Review error logs: `docker-compose -f docker-compose.prod.yml logs --tail=100`
- [ ] Monitor resource usage: `docker stats`

#### Weekly
- [ ] Review security logs
- [ ] Check backup integrity
- [ ] Update dependencies (in staging first)
- [ ] Review performance metrics

#### Monthly
- [ ] Security audit
- [ ] SSL certificate renewal check
- [ ] Capacity planning review
- [ ] Disaster recovery test

### Updates and Patches

#### Application Updates
```bash
# 1. Deploy to staging first
git checkout staging
./scripts/deploy-staging.sh

# 2. Test staging deployment
./scripts/test-staging.sh

# 3. Deploy to production
git checkout main
git merge staging
./scripts/deploy-production.sh
```

#### Security Updates
```bash
# Update base images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update system packages
sudo apt-get update && sudo apt-get upgrade
```

## Support and Monitoring

### Key Metrics to Monitor
- Response time (target: <2s for API calls)
- Error rate (target: <1%)
- CPU usage (target: <80%)
- Memory usage (target: <80%)
- Disk usage (target: <90%)
- SSL certificate expiry
- Backup success rate

### Alerting Thresholds
- Critical: Service down, database offline, SSL expired
- Warning: High resource usage, slow response times
- Info: Successful deployments, backup completions

### Log Locations
- Application logs: `/opt/6fb-booking/logs/`
- Container logs: `docker-compose -f docker-compose.prod.yml logs`
- System logs: `/var/log/`
- Nginx logs: `/opt/6fb-booking/logs/nginx/`

## Security Best Practices

### Access Control
- Use strong passwords (12+ characters)
- Enable 2FA for all admin accounts
- Limit SSH access to specific IPs
- Regular security audits

### Data Protection
- Database encryption at rest
- HTTPS for all communications
- Regular backups with encryption
- PCI DSS compliance for payment data

### Monitoring
- Real-time error tracking (Sentry)
- Security event monitoring
- Intrusion detection
- Regular penetration testing

---

For additional support or questions, refer to the troubleshooting section or contact the development team.

Last updated: 2025-06-24
