# 🚀 BookBarber API - Production Deployment Commands

## 🎯 Complete Production Setup for api.bookbarber.com

### Prerequisites Check
- [ ] Server with Ubuntu 22.04, 2GB RAM, 20GB storage
- [ ] Domain `api.bookbarber.com` pointing to server IP
- [ ] Stripe live API keys
- [ ] Email service credentials (SendGrid/Gmail)
- [ ] SSL certificate or Let's Encrypt setup

---

## 🔥 One-Command Production Deployment

### Step 1: Server Setup
```bash
# SSH into your server
ssh root@your-server-ip

# Update system and install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/bookbarber && cd /opt/bookbarber
```

### Step 2: Deploy Application
```bash
# Clone repository
git clone https://github.com/yourusername/6fb-booking.git .
cd backend

# Configure environment
cp .env.production .env
nano .env  # Edit with your actual values

# Generate secure keys
python3 -c 'import secrets; print("SECRET_KEY=" + secrets.token_urlsafe(64))' >> .env
python3 -c 'import secrets; print("JWT_SECRET_KEY=" + secrets.token_urlsafe(64))' >> .env

# Set up SSL (Let's Encrypt)
apt install certbot -y
certbot certonly --standalone -d api.bookbarber.com
mkdir -p ssl
cp /etc/letsencrypt/live/api.bookbarber.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/api.bookbarber.com/privkey.pem ssl/key.pem

# Deploy with one command
./start-production.sh
```

---

## 📝 Environment Configuration Template

### Critical Variables (Must Configure)
```env
# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://bookbarber_user:YOUR_DB_PASSWORD@db:5432/6fb_booking_prod

# Security (Generate with: python3 -c 'import secrets; print(secrets.token_urlsafe(64))')
SECRET_KEY=YOUR_64_CHAR_SECRET_KEY
JWT_SECRET_KEY=YOUR_64_CHAR_JWT_SECRET_KEY

# Stripe (Live keys from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_CONNECT_CLIENT_ID=ca_YOUR_CONNECT_CLIENT_ID

# Email (Choose SendGrid or Gmail)
# Option A: SendGrid
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@bookbarber.com

# Option B: Gmail
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=youremail@gmail.com
# SMTP_PASSWORD=YOUR_16_DIGIT_APP_PASSWORD
# FROM_EMAIL=youremail@gmail.com

# Application
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://bookbarber.com
BACKEND_CORS_ORIGINS=["https://bookbarber.com","https://api.bookbarber.com"]
```

---

## 🚀 Platform-Specific Deployment

### DigitalOcean (Recommended)
```bash
# 1. Create Droplet ($12/month Basic plan)
# 2. SSH and run above commands
# 3. Configure DNS: A record api.bookbarber.com → server IP
# 4. Total cost: ~$27/month with managed PostgreSQL

# Quick deploy script:
curl -fsSL https://raw.githubusercontent.com/yourusername/6fb-booking/main/backend/start-production.sh | bash
```

### Render (Easiest)
```bash
# 1. Push code to GitHub
# 2. Create Render account
# 3. New Web Service:
#    - GitHub repo: your-repo
#    - Environment: Docker
#    - Build Command: docker build -t api .
#    - Start Command: sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4"
# 4. Add PostgreSQL database
# 5. Configure environment variables in dashboard
# 6. Deploy automatically
```

### Railway (Budget)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway add postgresql
railway up

# Configure environment variables in Railway dashboard
```

---

## 🔧 Post-Deployment Configuration

### 1. Stripe Webhook Setup
```bash
# In Stripe Dashboard:
# 1. Go to Webhooks → Add endpoint
# 2. URL: https://api.bookbarber.com/api/v1/webhooks/stripe
# 3. Events: payment_intent.succeeded, payment_intent.payment_failed, account.updated
# 4. Copy webhook secret to STRIPE_WEBHOOK_SECRET in .env
# 5. Restart API: docker-compose -f docker-compose.prod.yml restart api
```

### 2. Database Migration
```bash
# Apply database migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Verify tables created
docker-compose -f docker-compose.prod.yml exec api python -c "
from config.database import engine
print('Tables:', engine.table_names())
"
```

### 3. Test All Functionality
```bash
# Health check
curl https://api.bookbarber.com/health

# API documentation
curl https://api.bookbarber.com/docs

# Test authentication
curl -X POST https://api.bookbarber.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bookbarber.com",
    "password": "securepass123",
    "full_name": "Admin User"
  }'

# Test email
curl -X POST https://api.bookbarber.com/api/v1/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 📊 Monitoring & Maintenance

### Daily Health Checks
```bash
# Create monitoring script
cat > /opt/bookbarber/monitor.sh << 'EOF'
#!/bin/bash
echo "BookBarber API Health Check - $(date)"
echo "=================================="

# Check API health
if curl -f https://api.bookbarber.com/health > /dev/null 2>&1; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Down"
fi

# Check container status
echo "Container Status:"
cd /opt/bookbarber/backend
docker-compose -f docker-compose.prod.yml ps

# Check disk usage
echo "Disk Usage:"
df -h

# Check memory usage
echo "Memory Usage:"
free -h
EOF

chmod +x /opt/bookbarber/monitor.sh

# Add to crontab for daily checks
echo "0 9 * * * /opt/bookbarber/monitor.sh >> /var/log/bookbarber-health.log 2>&1" | crontab -
```

### Backup Setup
```bash
# Create backup script
cat > /opt/bookbarber/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/bookbarber/backups"
mkdir -p $BACKUP_DIR

# Database backup
cd /opt/bookbarber/backend
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U bookbarber_user 6fb_booking_prod > $BACKUP_DIR/db_backup_$DATE.sql

# Configuration backup
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz .env ssl/ docker-compose.prod.yml

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql"
EOF

chmod +x /opt/bookbarber/backup.sh

# Daily backup at 2 AM
echo "0 2 * * * /opt/bookbarber/backup.sh >> /var/log/bookbarber-backup.log 2>&1" | crontab -
```

---

## 🔒 Security Hardening

### Firewall Configuration
```bash
# Configure UFW firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw --force enable

# Optional: Change SSH port
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
systemctl restart ssh
ufw allow 2222
ufw delete allow 22
```

### SSL Certificate Auto-Renewal
```bash
# Set up auto-renewal for Let's Encrypt
echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | crontab -

# Test renewal
certbot renew --dry-run
```

### Log Rotation
```bash
# Configure log rotation
cat > /etc/logrotate.d/bookbarber << 'EOF'
/opt/bookbarber/backend/logs/*.log {
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

---

## 🎯 Final Verification Checklist

### Pre-Go-Live Checks
```bash
# 1. Health check
curl -f https://api.bookbarber.com/health
# Expected: {"status":"healthy","timestamp":"..."}

# 2. SSL certificate
curl -I https://api.bookbarber.com/health | grep "HTTP/2 200"
# Expected: HTTP/2 200

# 3. Database connection
curl -f https://api.bookbarber.com/api/v1/health/database
# Expected: {"database":"connected"}

# 4. Authentication flow
curl -X POST https://api.bookbarber.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}'
# Expected: User created successfully

# 5. Email service
curl -X POST https://api.bookbarber.com/api/v1/test/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Expected: Email sent successfully

# 6. Payment system
curl https://api.bookbarber.com/api/v1/stripe/connect/oauth/url
# Expected: Stripe OAuth URL returned

# 7. Booking system
curl https://api.bookbarber.com/api/v1/services
# Expected: List of services (may be empty initially)

# 8. Performance check
time curl https://api.bookbarber.com/health
# Expected: Response time < 500ms
```

### Success Metrics
- [ ] **Uptime**: 99.9%+ availability
- [ ] **Response Time**: < 500ms average
- [ ] **Memory Usage**: < 80% of available
- [ ] **Disk Usage**: < 80% of available
- [ ] **SSL Rating**: A+ on SSL Labs
- [ ] **Security**: No vulnerabilities in dependencies

---

## 🚨 Emergency Commands

### If API Goes Down
```bash
# Quick restart
cd /opt/bookbarber/backend
docker-compose -f docker-compose.prod.yml restart api

# Full restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### If Database Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U bookbarber_user

# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U bookbarber_user -d 6fb_booking_prod

# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U bookbarber_user -d 6fb_booking_prod < backups/db_backup_YYYYMMDD_HHMMSS.sql
```

### If High Load
```bash
# Scale API containers
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Check resource usage
docker stats
htop
```

---

## 📞 Support Information

### Logs Location
```bash
# Application logs
/opt/bookbarber/backend/logs/

# System logs
/var/log/bookbarber-health.log
/var/log/bookbarber-backup.log

# Docker logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### Configuration Files
```bash
# Main configuration
/opt/bookbarber/backend/.env

# Docker configuration
/opt/bookbarber/backend/docker-compose.prod.yml

# SSL certificates
/opt/bookbarber/backend/ssl/
```

### Key Commands
```bash
# Status check
docker-compose -f docker-compose.prod.yml ps

# Restart API
docker-compose -f docker-compose.prod.yml restart api

# View logs
docker-compose -f docker-compose.prod.yml logs -f api

# Database backup
./backup.sh

# Health monitoring
./monitor.sh
```

**🎉 Production deployment complete!**

Your BookBarber API is now live at: **https://api.bookbarber.com**

Documentation: **https://api.bookbarber.com/docs**