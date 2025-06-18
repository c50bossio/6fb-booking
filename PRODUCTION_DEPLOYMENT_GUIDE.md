# 6FB Platform - Production Deployment Guide

## Overview
This guide walks you through deploying the 6FB Platform to production using cloud services.

## Deployment Options

### Option 1: DigitalOcean App Platform (Recommended - Easiest)
- **Cost**: ~$24/month (1 backend, 1 frontend, 1 database)
- **Pros**: Simple setup, automatic SSL, built-in CI/CD
- **Best for**: Quick deployment with minimal configuration

### Option 2: AWS (EC2 + RDS)
- **Cost**: ~$50-100/month
- **Pros**: Scalable, full control, enterprise features
- **Best for**: Large scale deployments

### Option 3: Heroku
- **Cost**: ~$25/month (2 dynos + database)
- **Pros**: Very easy deployment, good for MVPs
- **Best for**: Rapid prototyping

### Option 4: VPS (DigitalOcean Droplet, Linode)
- **Cost**: ~$20-40/month
- **Pros**: Full control, cost-effective
- **Best for**: Technical users who want control

## Quick Deployment: DigitalOcean App Platform

### Prerequisites
1. DigitalOcean account
2. Domain name (6fbmentorship.com)
3. GitHub repository (optional but recommended)

### Step 1: Prepare Your Code

1. **Update production settings**:
```bash
# Create production environment file
cp backend/.env.example backend/.env.production
```

Edit `backend/.env.production`:
```env
# Database (will be provided by DigitalOcean)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Security
SECRET_KEY=generate-a-secure-random-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# SendGrid (already configured)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=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
EMAIL_FROM_NAME=Chris Bossio - 6FB Mentorship
EMAIL_FROM_ADDRESS=support@em3014.6fbmentorship.com

# Stripe
STRIPE_SECRET_KEY=your-production-stripe-key
STRIPE_PUBLISHABLE_KEY=your-production-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Frontend URL
FRONTEND_URL=https://6fbmentorship.com

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
```

2. **Create deployment configuration**:

Create `deploy/app.yaml`:
```yaml
name: 6fb-platform
region: nyc
features:
  - buildpack-stack=ubuntu-22

services:
  - name: backend
    github:
      repo: your-github-username/6fb-booking
      branch: main
      deploy_on_push: true
    source_dir: backend
    dockerfile_path: backend/Dockerfile
    http_port: 8000
    instance_count: 1
    instance_size_slug: basic-xs
    health_check:
      http_path: /health
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_TIME
        value: ${redis.REDIS_URL}
      - key: ENVIRONMENT
        scope: RUN_TIME
        value: production

  - name: frontend
    github:
      repo: your-github-username/6fb-booking
      branch: main
      deploy_on_push: true
    source_dir: frontend
    dockerfile_path: frontend/Dockerfile
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xs
    routes:
      - path: /
    envs:
      - key: NEXT_PUBLIC_API_URL
        scope: BUILD_TIME
        value: ${backend.PUBLIC_URL}

databases:
  - name: db
    engine: PG
    version: "15"
    size: db-s-dev-database
    num_nodes: 1

  - name: redis
    engine: REDIS
    version: "7"
    size: db-s-dev-database
    num_nodes: 1
```

### Step 2: Deploy to DigitalOcean

1. **Using DigitalOcean CLI**:
```bash
# Install doctl
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init

# Create app
doctl apps create --spec deploy/app.yaml
```

2. **Using Web Interface**:
   - Go to https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Connect your GitHub repository
   - DigitalOcean will auto-detect the Dockerfiles
   - Configure environment variables
   - Deploy!

### Step 3: Configure Domain

1. **In DigitalOcean**:
   - Go to your app settings
   - Click "Domains"
   - Add `6fbmentorship.com`
   - DigitalOcean provides the DNS records

2. **At your domain registrar**:
   - Add provided DNS records
   - Wait for propagation (5-30 minutes)

### Step 4: Post-Deployment Setup

1. **Initialize database**:
```bash
# SSH into your backend container
doctl apps console [app-id] --component backend

# Run migrations
cd /app
alembic upgrade head

# Create admin user
python scripts/create_admin.py
```

2. **Configure Stripe webhooks**:
   - Go to Stripe Dashboard
   - Add webhook endpoint: `https://api.6fbmentorship.com/api/webhooks/stripe`
   - Select events to listen for

3. **Test the deployment**:
   - Visit https://6fbmentorship.com
   - Login with admin credentials
   - Send test email
   - Process test payment

## Alternative: Docker Compose on VPS

### Quick VPS Setup (DigitalOcean Droplet)

1. **Create Droplet**:
```bash
# Create Ubuntu 22.04 droplet
doctl compute droplet create 6fb-platform \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys [your-ssh-key-id]
```

2. **SSH and setup**:
```bash
ssh root@[droplet-ip]

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin

# Clone your repository
git clone https://github.com/your-username/6fb-booking.git
cd 6fb-booking

# Create .env file
cp .env.production.example .env

# Start services
docker compose -f docker-compose.prod.yml up -d
```

3. **Setup Nginx & SSL**:
```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d 6fbmentorship.com -d www.6fbmentorship.com
```

## Monitoring Setup

### 1. **Application Monitoring (Sentry)**:
```bash
# Add to backend/.env
SENTRY_DSN=your-sentry-dsn
```

### 2. **Uptime Monitoring**:
- Use DigitalOcean monitoring (included)
- Or set up UptimeRobot (free)

### 3. **Log Management**:
```bash
# View logs
doctl apps logs [app-id] --follow

# Or with Docker
docker compose logs -f backend
```

## CI/CD Pipeline

Your GitHub Actions workflow (`.github/workflows/deploy.yml`) is already configured to:
1. Run tests on push
2. Build Docker images
3. Deploy to DigitalOcean (if using App Platform)

Just add these secrets to GitHub:
- `DIGITALOCEAN_ACCESS_TOKEN`
- `DIGITALOCEAN_APP_ID`

## Production Checklist

### Security
- [ ] Strong SECRET_KEY in production
- [ ] HTTPS enabled (automatic with DigitalOcean)
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain

### Performance
- [ ] Redis caching enabled
- [ ] Database indexes created
- [ ] Static files served via CDN
- [ ] Image optimization enabled

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Log aggregation

### Business
- [ ] Stripe production keys
- [ ] SendGrid domain verification
- [ ] Backup strategy
- [ ] Disaster recovery plan

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check DATABASE_URL format
   - Ensure database is accessible
   - Check firewall rules

2. **Static files not loading**:
   - Check Nginx configuration
   - Verify CORS settings
   - Check CDN configuration

3. **Email delivery issues**:
   - Verify SendGrid configuration
   - Check domain authentication
   - Monitor SendGrid dashboard

## Support

- DigitalOcean Support: https://www.digitalocean.com/support/
- Docker Documentation: https://docs.docker.com/
- Your deployment logs: `doctl apps logs [app-id]`

## Next Steps

After deployment:
1. Test all features in production
2. Set up automated backups
3. Configure monitoring alerts
4. Create user documentation
5. Plan your launch strategy!