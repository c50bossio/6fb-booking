# DigitalOcean Deployment Checklist - 6FB Booking Platform

## 🚀 Pre-Deployment Setup

### ✅ 1. DigitalOcean Account Setup
- [ ] Create DigitalOcean account
- [ ] Add payment method
- [ ] Create SSH key pair and add to DigitalOcean
- [ ] Create project for 6FB Platform

### ✅ 2. Domain & DNS Configuration
- [ ] Purchase domain (e.g., yourdomain.com)
- [ ] Configure DNS to point to DigitalOcean nameservers
- [ ] Set up A records for:
  - `yourdomain.com` → Droplet IP
  - `www.yourdomain.com` → Droplet IP
  - `api.yourdomain.com` → Droplet IP (optional)

### ✅ 3. DigitalOcean Resources Setup

#### Droplet (Virtual Machine)
```bash
# Recommended specs for production:
- **Size**: 4GB RAM, 2 CPUs, 80GB SSD ($24/month)
- **Region**: Choose closest to your users
- **OS**: Ubuntu 22.04 LTS
- **SSH Keys**: Add your SSH key
- **Monitoring**: Enable
- **Backups**: Enable (recommended)
```

#### Managed Database (PostgreSQL)
```bash
# Create managed PostgreSQL database
- **Engine**: PostgreSQL 15
- **Size**: 1GB RAM, 1 CPU, 10GB SSD ($15/month)
- **Region**: Same as Droplet
- **Trusted Sources**: Add Droplet IP
```

#### Managed Redis (Optional)
```bash
# For caching and session storage
- **Size**: 1GB RAM ($15/month)
- **Region**: Same as Droplet
```

#### Spaces (Object Storage)
```bash
# For file uploads and backups
- **Region**: Same as Droplet
- **CDN**: Enable for global delivery
```

## 🔧 Environment Configuration

### ✅ 4. Update .env.production File

Replace these placeholder values in your `.env.production`:

```env
# Database (from DigitalOcean Database)
DATABASE_URL=postgresql://doadmin:GENERATED_PASSWORD@db-postgresql-nyc1-12345-do-user-1234567-0.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require

# Redis (if using managed Redis)
REDIS_URL=rediss://default:REDIS_PASSWORD@redis-cluster-nyc1-12345-do-user-1234567-0.b.db.ondigitalocean.com:25061/0

# Your domain
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# DigitalOcean Spaces
DO_SPACES_KEY=YOUR_SPACES_ACCESS_KEY
DO_SPACES_SECRET=YOUR_SPACES_SECRET_KEY
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com

# Stripe (LIVE keys for production)
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET

# Email (SendGrid recommended)
SENDGRID_API_KEY=SG.YOUR_ACTUAL_SENDGRID_KEY
FROM_EMAIL=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=https://YOUR_ACTUAL_SENTRY_DSN@sentry.io/PROJECT_ID
```

### ✅ 5. Validate Configuration
```bash
# Run validation script
python validate-production-env.py
```

## 🚀 Deployment Process

### ✅ 6. Server Setup
```bash
# SSH into your Droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y git curl wget nano ufw certbot nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application user
useradd -m -s /bin/bash app
usermod -aG docker app
```

### ✅ 7. Application Deployment
```bash
# Switch to app user
su - app

# Clone repository
git clone https://github.com/yourusername/6fb-booking.git
cd 6fb-booking

# Copy production environment
cp .env.production .env

# Build and start services
docker-compose -f docker-compose.production.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.production.yml exec backend alembic upgrade head

# Create admin user
docker-compose -f docker-compose.production.yml exec backend python scripts/create_admin.py
```

### ✅ 8. SSL Certificate Setup
```bash
# Exit to root user
exit

# Install SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
certbot renew --dry-run

# Add to crontab for auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### ✅ 9. Nginx Configuration
```bash
# Create Nginx config
nano /etc/nginx/sites-available/6fb-platform

# Add configuration (see NGINX_CONFIG section below)

# Enable site
ln -s /etc/nginx/sites-available/6fb-platform /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### ✅ 10. Firewall Setup
```bash
# Configure UFW firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

## 🔧 Nginx Configuration

Create `/etc/nginx/sites-available/6fb-platform`:

```nginx
# Frontend (yourdomain.com)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (api.yourdomain.com)
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for API requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 🧪 Testing & Verification

### ✅ 11. Health Checks
```bash
# Test application health
curl -f https://yourdomain.com/api/v1/health

# Test database connectivity
curl -f https://yourdomain.com/api/v1/health/database

# Test Stripe webhook
curl -f https://yourdomain.com/api/v1/webhooks/stripe

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### ✅ 12. Monitoring Setup
```bash
# Access monitoring dashboards
# Grafana: http://yourdomain.com:3001
# Prometheus: http://yourdomain.com:9090

# Set up external monitoring
# Configure UptimeRobot, Pingdom, or similar service
```

## 🔄 Backup Configuration

### ✅ 13. Automated Backups
```bash
# Create backup script
mkdir -p /opt/6fb-backup
nano /opt/6fb-backup/backup.sh

# Add backup automation to crontab
crontab -e
# Add: 0 2 * * * /opt/6fb-backup/backup.sh
```

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose logs postgres

   # Test connection
   docker-compose exec backend python -c "from config.database import check_database_health; print(check_database_health())"
   ```

2. **SSL Certificate Issues**
   ```bash
   # Renew certificate
   certbot renew --dry-run

   # Check certificate status
   certbot certificates
   ```

3. **Application Not Starting**
   ```bash
   # Check logs
   docker-compose logs backend
   docker-compose logs frontend

   # Restart services
   docker-compose restart
   ```

## ✅ Final Checklist

- [ ] DigitalOcean resources created (Droplet, Database, Redis)
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Application deployed and running
- [ ] Database migrations completed
- [ ] Admin user created
- [ ] Firewall configured
- [ ] Nginx reverse proxy configured
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Stripe webhooks configured
- [ ] Email delivery tested

## 📞 Post-Deployment Support

### Monitoring Commands:
```bash
# Check system status
docker-compose ps
systemctl status nginx
ufw status

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
tail -f /var/log/nginx/error.log

# Check resource usage
docker stats
df -h
free -h
```

### Maintenance:
```bash
# Update application
git pull origin main
docker-compose build
docker-compose up -d

# Restart services
docker-compose restart

# Database backup
docker-compose exec postgres pg_dump -U sixfb_user sixfb_booking > backup.sql
```

🎉 **Congratulations! Your 6FB Booking Platform is now live on DigitalOcean!**
