# 6FB Platform Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoring](#monitoring)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- 4GB RAM minimum (8GB recommended for production)
- 20GB disk space

### Required Accounts
- GitHub account (for CI/CD)
- Domain name and SSL certificates
- Email service (SendGrid/SMTP)
- SMS service (Twilio) - optional
- AWS S3 (for backups) - optional

## Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/6fb-platform.git
cd 6fb-platform
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
# Edit .env with your local settings
```

### 3. Start Development Environment
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### 4. Access Services
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- MailHog (email testing): http://localhost:8025

### 5. Run Tests
```bash
# Backend tests
docker-compose -f docker-compose.dev.yml exec backend-dev pytest

# Frontend tests
docker-compose -f docker-compose.dev.yml exec frontend-dev npm test
```

## Production Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deployment directory
sudo mkdir -p /opt/6fb-platform
sudo chown $USER:$USER /opt/6fb-platform
```

### 2. SSL Certificates
```bash
# Option 1: Use Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Option 2: Copy existing certificates
mkdir -p nginx/ssl
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/
```

### 3. Configure Environment
```bash
cd /opt/6fb-platform
cp .env.production.example .env.production

# Edit with production values
nano .env.production
```

### 4. Deploy Application
```bash
# Pull latest code
git pull origin main

# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Create initial admin user
docker-compose -f docker-compose.prod.yml exec backend python scripts/create_admin.py
```

### 5. Verify Deployment
```bash
# Check service health
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check container status
docker-compose -f docker-compose.prod.yml ps
```

## CI/CD Pipeline

### GitHub Actions Setup

1. **Add Repository Secrets**:
   - `PRODUCTION_HOST`: Production server IP/hostname
   - `PRODUCTION_USER`: SSH username
   - `PRODUCTION_SSH_KEY`: Private SSH key
   - `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`: For staging
   - `SLACK_WEBHOOK`: For deployment notifications

2. **Workflow Files**:
   - `.github/workflows/ci-cd.yml`: Main CI/CD pipeline
   - `.github/workflows/security.yml`: Security scanning

3. **Deployment Process**:
   - Push to `develop` → Deploy to staging
   - Push to `main` → Deploy to production
   - Pull requests → Run tests only

### Manual Deployment
```bash
# Deploy specific version
git checkout v1.2.3
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Rollback
git checkout v1.2.2
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

### 1. Access Monitoring Tools
- Prometheus: http://yourdomain.com:9090
- Grafana: http://yourdomain.com:3001 (default: admin/admin)

### 2. Set Up Alerts
```bash
# Configure Slack webhook in Grafana
# Dashboard: Settings → Notification channels → Add channel

# Test alert
docker-compose -f docker-compose.prod.yml exec grafana grafana-cli admin reset-admin-password
```

### 3. View Metrics
- System metrics: CPU, memory, disk usage
- Application metrics: Request rate, error rate, response time
- Business metrics: Active users, appointments, revenue

### 4. Log Management
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f

# Export logs
docker-compose -f docker-compose.prod.yml logs > logs_$(date +%Y%m%d).txt
```

## Backup & Recovery

### Automated Backups
Backups run daily at 2 AM by default.

### Manual Backup
```bash
# Run backup manually
docker-compose -f docker-compose.prod.yml exec backup /backup.sh

# List backups
docker-compose -f docker-compose.prod.yml exec backup ls -la /backup/
```

### Restore Process
```bash
# List available backups
docker-compose -f docker-compose.prod.yml exec backup /restore.sh list

# Restore database
docker-compose -f docker-compose.prod.yml exec backup /restore.sh db /backup/db_backup_20250618_020000.sql.gz

# Restore uploads
docker-compose -f docker-compose.prod.yml exec backup /restore.sh uploads /backup/uploads_backup_20250618_020000.tar.gz

# Full restore
docker-compose -f docker-compose.prod.yml exec backup /restore.sh full /backup/db_backup_20250618_020000.sql.gz /backup/uploads_backup_20250618_020000.tar.gz
```

### Disaster Recovery
1. Provision new server
2. Install Docker and Docker Compose
3. Clone repository
4. Restore from S3 backup:
   ```bash
   aws s3 cp s3://your-bucket/backups/latest.sql.gz /backup/
   ```
5. Follow restore process above

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check disk space
df -h

# Check memory
free -m
```

#### 2. Database Connection Failed
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec backend python -c "from config.database import engine; engine.connect()"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL
openssl s_client -connect yourdomain.com:443
```

#### 4. High Memory Usage
```bash
# Check container stats
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Scale down replicas
docker-compose -f docker-compose.prod.yml up -d --scale backend=1
```

### Emergency Procedures

#### Take Site Offline
```bash
# Stop frontend only
docker-compose -f docker-compose.prod.yml stop frontend nginx

# Show maintenance page
docker run -d -p 80:80 -p 443:443 --name maintenance nginx
```

#### Emergency Rollback
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout HEAD~1

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

#### Reset Admin Password
```bash
docker-compose -f docker-compose.prod.yml exec backend python scripts/reset_admin_password.py
```

## Performance Tuning

### 1. Database Optimization
```bash
# Run VACUUM
docker-compose -f docker-compose.prod.yml exec postgres psql -U sixfb -c "VACUUM ANALYZE;"

# Check slow queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U sixfb -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### 2. Redis Optimization
```bash
# Check memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO memory

# Clear cache if needed
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

### 3. Scale Services
```bash
# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale frontend
docker-compose -f docker-compose.prod.yml up -d --scale frontend=2
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Configure firewall rules
- [ ] Enable fail2ban
- [ ] Set up SSL certificates
- [ ] Configure secure headers in nginx
- [ ] Enable database encryption
- [ ] Set up log rotation
- [ ] Configure backup encryption
- [ ] Review and update dependencies monthly
- [ ] Set up security scanning in CI/CD

## Support

For issues and questions:
- Check logs first: `docker-compose logs`
- Review documentation: `/docs`
- GitHub Issues: https://github.com/your-org/6fb-platform/issues
- Email: support@6fbplatform.com
