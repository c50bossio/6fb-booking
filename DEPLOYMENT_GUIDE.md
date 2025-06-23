# 6FB Booking Platform - Deployment Guide

This guide provides comprehensive instructions for deploying the 6FB Booking Platform to production environments with automated deployment scripts.

## 📋 Overview

The deployment automation includes:
- **deploy.sh**: Main deployment script with rollback capabilities
- **setup-production.sh**: Initial server setup and hardening
- **health-check.sh**: Post-deployment validation
- **rollback.sh**: Emergency rollback procedures
- **digitalocean-deploy.sh**: DigitalOcean App Platform deployment

## 🚀 Quick Start

### Option 1: DigitalOcean App Platform (Recommended)

```bash
# Install DigitalOcean CLI
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.100.0/doctl-1.100.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init

# Deploy
./scripts/digitalocean-deploy.sh --app-name=6fb-booking --region=nyc1
```

### Option 2: Traditional VPS/Server

```bash
# Initial server setup (run as root)
sudo ./scripts/setup-production.sh --domain=yourdomain.com --email=admin@yourdomain.com

# Deploy application
./scripts/deploy.sh

# Verify deployment
./scripts/health-check.sh
```

## 📁 Script Details

### 1. setup-production.sh

**Purpose**: Initial server setup and security hardening
**Run as**: Root user
**Frequency**: Once per server

**Features**:
- System package updates
- Security configuration (firewall, fail2ban)
- Nginx reverse proxy setup
- SSL certificate (Let's Encrypt)
- System user creation
- Directory structure setup
- Service configuration (systemd)
- Performance optimization
- Monitoring setup

**Usage**:
```bash
sudo ./scripts/setup-production.sh [OPTIONS]

Options:
  --domain=DOMAIN     Your domain name (default: localhost)
  --email=EMAIL       Email for SSL certificate (default: admin@example.com)
  --help              Show help message
```

**What it installs**:
- Python 3.11+, Node.js 18+
- PostgreSQL client tools
- Nginx web server
- Redis server
- Fail2ban intrusion prevention
- Certbot for SSL certificates
- System monitoring tools

### 2. deploy.sh

**Purpose**: Main deployment automation with rollback capabilities
**Run as**: Application user (not root)
**Frequency**: Every deployment

**Features**:
- Automatic backup creation
- Git repository updates
- Dependency installation
- Database migrations
- Service management
- Health checks
- Automatic rollback on failure
- Performance optimization

**Usage**:
```bash
./scripts/deploy.sh

Environment Variables (optional):
  DEPLOYMENT_USER=www-data
  DEPLOYMENT_GROUP=www-data
  BACKEND_URL=http://localhost:8000
  FRONTEND_URL=http://localhost:3000
```

**Deployment process**:
1. Create backup (code + database)
2. Stop services
3. Pull latest code
4. Update dependencies
5. Run database migrations
6. Build frontend
7. Start services
8. Run health checks
9. Rollback if any step fails

### 3. health-check.sh

**Purpose**: Comprehensive system and application health validation
**Run as**: Any user
**Frequency**: After deployments, scheduled monitoring

**Features**:
- System resource monitoring
- Service status checks
- Network connectivity tests
- Application endpoint validation
- Database connectivity
- Security configuration audit
- Performance benchmarks
- Log analysis

**Usage**:
```bash
./scripts/health-check.sh [OPTIONS]

Options:
  --backend-url=URL   Backend URL (default: http://localhost:8000)
  --frontend-url=URL  Frontend URL (default: http://localhost:3000)
  --domain=DOMAIN     Domain name (default: localhost)
  --help              Show help message
```

**Health checks performed**:
- Memory and disk usage
- Service status (nginx, backend, frontend, redis)
- API endpoint responses
- Database connectivity
- SSL certificate validity
- Security configuration
- Recent error logs

### 4. rollback.sh

**Purpose**: Emergency rollback to previous deployment state
**Run as**: Application user (not root)
**Frequency**: When needed

**Features**:
- List available backups
- Interactive backup selection
- Pre-rollback backup creation
- Code and database restoration
- Service management
- Health validation
- Automatic cleanup

**Usage**:
```bash
./scripts/rollback.sh [OPTIONS]

Options:
  --backup-index=N    Use backup number N (1-based)
  --force            Skip confirmation prompt
  --backend-url=URL   Backend URL for health checks
  --frontend-url=URL  Frontend URL for health checks
  --help              Show help message

Examples:
  ./scripts/rollback.sh                    # Interactive rollback
  ./scripts/rollback.sh --backup-index=1   # Rollback to latest backup
  ./scripts/rollback.sh --force            # Skip confirmation
```

### 5. digitalocean-deploy.sh

**Purpose**: DigitalOcean App Platform deployment automation
**Run as**: Any user with doctl access
**Frequency**: Initial deployment and updates

**Features**:
- App Platform configuration generation
- Dockerfile creation for both services
- Environment variable templates
- GitHub Actions workflow
- Database and Redis setup
- Domain configuration
- Monitoring setup
- Health checks

**Usage**:
```bash
./scripts/digitalocean-deploy.sh [OPTIONS]

Options:
  --app-name=NAME     App name (default: 6fb-booking-platform)
  --region=REGION     DigitalOcean region (default: nyc1)
  --domain=DOMAIN     Custom domain (optional)
  --branch=BRANCH     Git branch to deploy (default: main)
  --help              Show help message
```

## 🔧 Environment Setup

### Required Environment Variables

Create these files before deployment:

**Backend (.env)**:
```env
# Security (Generate with: openssl rand -base64 32)
SECRET_KEY=your-64-character-secret-key
JWT_SECRET_KEY=your-64-character-jwt-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Stripe
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_CONNECT_CLIENT_ID=ca_your-connect-client-id

# Email
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# CORS
FRONTEND_URL=https://yourdomain.com
ENVIRONMENT=production
```

**Frontend (.env.local)**:
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourapi.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

### Generate Secure Keys

```bash
# Generate 64-character secret keys
openssl rand -base64 48

# Generate using Python
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
```

## 🏗️ Deployment Architectures

### Architecture 1: Single VPS/Server

```
Internet → Nginx (SSL) → Frontend (Next.js) + Backend (FastAPI)
                      ↓
                   PostgreSQL + Redis
```

**Pros**: Simple, cost-effective, full control
**Cons**: Single point of failure, manual scaling
**Best for**: Small to medium deployments

### Architecture 2: DigitalOcean App Platform

```
Internet → Load Balancer → Frontend Service + Backend Service
                        ↓
                   Managed Database + Redis
```

**Pros**: Fully managed, auto-scaling, high availability
**Cons**: Higher cost, less control
**Best for**: Production deployments, scaling needs

### Architecture 3: Containerized (Docker)

```
Internet → Nginx → Docker Containers (Frontend + Backend)
                ↓
             External Database
```

**Pros**: Portable, consistent environments, easy scaling
**Cons**: More complex setup, container orchestration
**Best for**: Multi-environment deployments

## 📊 Performance Optimization

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX CONCURRENTLY idx_appointments_client_id ON appointments(client_id);
CREATE INDEX CONCURRENTLY idx_appointments_date ON appointments(appointment_date);
CREATE INDEX CONCURRENTLY idx_payments_appointment_id ON payments(appointment_id);
```

### Nginx Optimization

```nginx
# Enable gzip compression
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

### Frontend Optimization

```javascript
// next.config.js optimizations
module.exports = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle analysis
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
};
```

## 🔒 Security Best Practices

### Server Security

1. **Firewall Configuration**:
   ```bash
   # UFW rules (applied by setup script)
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow ssh
   ufw allow 'Nginx Full'
   ```

2. **SSL/TLS Configuration**:
   ```nginx
   # Strong SSL configuration
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
   ssl_prefer_server_ciphers off;
   ```

3. **Fail2ban Protection**:
   ```ini
   # SSH protection (configured by setup script)
   [sshd]
   enabled = true
   maxretry = 3
   bantime = 3600
   ```

### Application Security

1. **Environment Variables**: Never commit secrets to git
2. **CORS Configuration**: Restrict to your domain only
3. **Rate Limiting**: Prevent API abuse
4. **Input Validation**: Sanitize all user inputs
5. **SQL Injection Prevention**: Use parameterized queries

## 📈 Monitoring and Alerting

### Health Check Endpoints

- **Backend Health**: `/api/v1/health`
- **Frontend Health**: Available at root URL
- **Database Health**: Included in backend health check
- **Security Health**: `/api/v1/security/status`

### Monitoring Setup

1. **UptimeRobot**: External uptime monitoring
2. **Sentry**: Error tracking and performance monitoring
3. **Google Analytics**: User behavior analytics
4. **Custom Metrics**: Business-specific KPIs

### Alert Configuration

```yaml
# Example monitoring alerts
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    duration: "5m"
    action: "email + slack"
    
  - name: "High Response Time"
    condition: "response_time > 2s"
    duration: "5m"
    action: "email"
    
  - name: "Database Connection Failed"
    condition: "db_connection_failed"
    duration: "1m"
    action: "email + sms + slack"
```

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Database Connection Failed**:
   ```bash
   # Check database credentials
   ./scripts/health-check.sh
   
   # Test database connection manually
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Service Not Starting**:
   ```bash
   # Check service logs
   journalctl -u 6fb-backend -f
   journalctl -u 6fb-frontend -f
   
   # Check service status
   systemctl status 6fb-backend
   systemctl status 6fb-frontend
   ```

3. **Nginx Configuration Error**:
   ```bash
   # Test Nginx configuration
   nginx -t
   
   # Reload Nginx
   systemctl reload nginx
   ```

4. **SSL Certificate Issues**:
   ```bash
   # Check certificate status
   certbot certificates
   
   # Renew certificate
   certbot renew --dry-run
   ```

### Emergency Procedures

1. **Immediate Rollback**:
   ```bash
   ./scripts/rollback.sh --backup-index=1 --force
   ```

2. **Service Recovery**:
   ```bash
   # Restart all services
   sudo systemctl restart 6fb-backend 6fb-frontend nginx
   ```

3. **Database Recovery**:
   ```bash
   # Restore from latest backup
   psql $DATABASE_URL < /var/backups/6fb-booking/latest-backup.sql
   ```

## 📞 Support and Resources

### Documentation Links
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Nginx Configuration](https://nginx.org/en/docs/)

### Log Locations
- **Application Logs**: `/var/log/6fb-booking/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `journalctl`
- **Deployment Logs**: `/var/log/6fb-booking/deployment-*.log`

### Useful Commands

```bash
# Check all service statuses
systemctl status 6fb-backend 6fb-frontend nginx redis

# View recent logs
journalctl -u 6fb-backend --since "1 hour ago"

# Check disk space
df -h

# Check memory usage
free -h

# Check network connections
netstat -tulpn

# Test API endpoints
curl -f https://yourdomain.com/api/v1/health

# Monitor deployment
tail -f /var/log/6fb-booking/deployment-*.log
```

This deployment guide provides everything needed to deploy the 6FB Booking Platform to production environments with confidence and proper monitoring.