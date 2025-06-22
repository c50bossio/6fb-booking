# 🚀 BookBarber API - Production Deployment Guide

*Complete guide for deploying the BookBarber backend to production at api.bookbarber.com*

## 📋 Quick Start Checklist

### Prerequisites
- [ ] **Domain**: Point `api.bookbarber.com` to your server IP
- [ ] **Server**: Linux server with 2GB+ RAM, 20GB+ storage
- [ ] **Docker**: Install Docker and Docker Compose
- [ ] **SSL Certificate**: Obtain SSL certificate for HTTPS
- [ ] **API Keys**: Collect all required API keys (Stripe, email, etc.)

### Deployment Steps
1. [Server Setup](#1-server-setup)
2. [Environment Configuration](#2-environment-configuration)
3. [SSL Certificate Setup](#3-ssl-certificate-setup)
4. [Database Setup](#4-database-setup)
5. [Application Deployment](#5-application-deployment)
6. [Monitoring & Maintenance](#6-monitoring--maintenance)

---

## 1. Server Setup

### Option A: DigitalOcean (Recommended)
```bash
# Create a new Droplet
# - Image: Ubuntu 22.04 LTS
# - Size: Basic $12/month (2GB RAM, 1 vCPU, 50GB SSD)
# - Region: Choose closest to your users
# - Additional options: Enable monitoring, backups

# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/bookbarber
cd /opt/bookbarber
```

### Option B: Render (Platform as a Service)
```bash
# 1. Create account at render.com
# 2. Connect GitHub repository
# 3. Create new Web Service:
#    - Environment: Docker
#    - Build Command: docker build -t bookbarber-api .
#    - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
#    - Instance Type: Standard ($7/month)
# 4. Add environment variables in Render dashboard

# Create PostgreSQL database in Render:
# - Go to Dashboard > New > PostgreSQL
# - Name: bookbarber-db
# - Plan: Starter ($7/month)
# - Copy connection string for DATABASE_URL
```

### Option C: Railway (Simple Alternative)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway init
railway add postgresql
railway up

# Railway will provide:
# - DATABASE_URL automatically
# - Custom domain setup
# - SSL certificates
```

---

## 2. Environment Configuration

### Step 1: Create Production Environment File
```bash
# Copy the template
cp .env.production .env

# Edit with your actual values
nano .env
```

### Step 2: Required API Keys

#### Stripe Configuration (REQUIRED)
```bash
# Get from Stripe Dashboard (https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_...  # NOT sk_test_
STRIPE_PUBLISHABLE_KEY=pk_live_...  # NOT pk_test_
STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook endpoint
STRIPE_CONNECT_CLIENT_ID=ca_...  # From Connect settings
```

#### Email Configuration (REQUIRED)
Choose one option:

**Option A: SendGrid (Recommended)**
```bash
# Sign up at sendgrid.com
# Create API key with Mail Send permissions
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@bookbarber.com
```

**Option B: Gmail**
```bash
# Enable 2FA and create App Password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=youremail@gmail.com
SMTP_PASSWORD=16-digit-app-password
FROM_EMAIL=youremail@gmail.com
```

#### Security Keys (REQUIRED)
```bash
# Generate secure random keys
python3 -c 'import secrets; print("SECRET_KEY=" + secrets.token_urlsafe(64))'
python3 -c 'import secrets; print("JWT_SECRET_KEY=" + secrets.token_urlsafe(64))'
```

### Step 3: Database Configuration
```bash
# For PostgreSQL (recommended)
DATABASE_URL=postgresql://username:password@localhost:5432/6fb_booking_prod

# Update docker-compose.prod.yml with your DB password
export DB_PASSWORD="your-secure-db-password"
```

---

## 3. SSL Certificate Setup

### Option A: Let's Encrypt (Free)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
certbot certonly --standalone -d api.bookbarber.com

# Certificates will be saved to:
# /etc/letsencrypt/live/api.bookbarber.com/fullchain.pem
# /etc/letsencrypt/live/api.bookbarber.com/privkey.pem

# Copy certificates to project
mkdir -p ssl
cp /etc/letsencrypt/live/api.bookbarber.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/api.bookbarber.com/privkey.pem ssl/key.pem

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Option B: Cloudflare (Alternative)
```bash
# If using Cloudflare:
# 1. Enable SSL/TLS in Cloudflare dashboard
# 2. Set SSL/TLS encryption mode to "Full"
# 3. Update nginx.conf to use port 80 only
# 4. Cloudflare handles SSL termination
```

---

## 4. Database Setup

### Method 1: Docker Compose (Recommended)
```bash
# Database will be created automatically
# Just set the DB_PASSWORD environment variable
export DB_PASSWORD="your-secure-db-password"
```

### Method 2: External Database
```bash
# For managed database (Render, DigitalOcean, AWS RDS)
# Just update DATABASE_URL in .env file
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

---

## 5. Application Deployment

### Method 1: Docker Compose (One-Command Deploy)
```bash
# Clone repository
git clone https://github.com/yourusername/6fb-booking.git
cd 6fb-booking/backend

# Set environment variables
export DB_PASSWORD="your-secure-db-password"

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### Method 2: Traditional Deployment
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start with systemd (create service file)
sudo cp 6fb-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable 6fb-api
sudo systemctl start 6fb-api
```

### Method 3: Platform-as-a-Service

#### Render Deployment
```bash
# 1. Push code to GitHub
# 2. Connect repository in Render dashboard
# 3. Create Web Service with:
#    - Environment: Docker
#    - Build Command: docker build -t api .
#    - Start Command: sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4"
# 4. Add environment variables
# 5. Deploy
```

#### Railway Deployment
```bash
railway init
railway add postgresql
railway up
```

---

## 6. Monitoring & Maintenance

### Health Checks
```bash
# Test API health
curl https://api.bookbarber.com/health

# Test authentication
curl -X POST https://api.bookbarber.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Test database connection
docker-compose -f docker-compose.prod.yml exec api python -c "
from config.database import SessionLocal
db = SessionLocal()
print('Database connection: OK')
db.close()
"
```

### Backup Strategy
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/bookbarber/backups"
mkdir -p $BACKUP_DIR

# Database backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U bookbarber_user 6fb_booking_prod > $BACKUP_DIR/db_backup_$DATE.sql

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql s3://your-backup-bucket/

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql"

# Add to crontab for daily backups
echo "0 2 * * * /opt/bookbarber/backup.sh" | crontab -
```

### Log Management
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f api

# View nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# Set up log rotation
sudo tee /etc/logrotate.d/bookbarber << EOF
/opt/bookbarber/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

### Performance Monitoring
```bash
# Install monitoring (optional)
docker run -d \
  --name=prometheus \
  -p 9090:9090 \
  prom/prometheus

# Monitor system resources
htop
df -h
free -m

# Database performance
docker-compose -f docker-compose.prod.yml exec db psql -U bookbarber_user -d 6fb_booking_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Check connection string
echo $DATABASE_URL

# Test connection manually
docker-compose -f docker-compose.prod.yml exec db psql -U bookbarber_user -d 6fb_booking_prod -c "SELECT 1;"
```

#### 2. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Renew Let's Encrypt certificate
certbot renew --dry-run

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

#### 3. Email Not Working
```bash
# Test email configuration
docker-compose -f docker-compose.prod.yml exec api python -c "
from services.email_service import EmailService
service = EmailService()
service.send_test_email('test@example.com')
"
```

#### 4. High Memory Usage
```bash
# Check memory usage
docker stats

# Reduce worker count in production
# Edit docker-compose.prod.yml:
# command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Getting Help
- **Documentation**: Check `/docs` endpoint for API documentation
- **Logs**: Always check logs first: `docker-compose logs -f api`
- **Health Check**: Verify `/health` endpoint returns 200
- **Database**: Ensure migrations are applied: `alembic current`

---

## 🎯 Post-Deployment Checklist

- [ ] **API Health**: `curl https://api.bookbarber.com/health` returns 200
- [ ] **Authentication**: Login endpoint works correctly
- [ ] **Database**: Migrations applied successfully
- [ ] **SSL**: HTTPS works without certificate warnings
- [ ] **Email**: Test email sending functionality
- [ ] **Stripe**: Webhook endpoints configured
- [ ] **Monitoring**: Logs are being written
- [ ] **Backups**: Automated backup script running
- [ ] **Performance**: Response times under 500ms
- [ ] **Security**: All sensitive data encrypted

### Stripe Webhook Configuration
After deployment, configure webhooks in Stripe Dashboard:

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://api.bookbarber.com/api/v1/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `connect.account.updated`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

### Final Verification
```bash
# Run comprehensive test
curl -X POST https://api.bookbarber.com/api/v1/test/health-check

# Verify all services
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats --no-stream
```

🎉 **Congratulations!** Your BookBarber API is now live at `https://api.bookbarber.com`

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- **Weekly**: Check logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize database performance
- **Annually**: Renew SSL certificates and review security

### Emergency Contacts
- **Server Issues**: Contact your hosting provider
- **Application Errors**: Check logs and restart services
- **Database Issues**: Restore from latest backup
- **SSL Expiry**: Run `certbot renew` and restart nginx

**Production is live! 🚀**