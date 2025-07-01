# 6FB Booking Platform - Deployment Guide

## Overview

The 6FB Booking Platform is a comprehensive barbershop booking and business management system built with FastAPI (backend) and Next.js 14 (frontend). This document provides complete deployment instructions for production environments.

## Table of Contents
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Database Setup](#database-setup)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Performance Metrics](#performance-metrics)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## System Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: SQLAlchemy 2.0 with Alembic migrations
- **Authentication**: JWT tokens with bcrypt password hashing
- **API**: RESTful with OpenAPI/Swagger documentation
- **Rate Limiting**: slowapi integration
- **Payment Processing**: Stripe Connect integration

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with TypeScript
- **UI Library**: Tailwind CSS with custom design system
- **Icons**: Heroicons and Lucide React
- **Charts**: Chart.js with react-chartjs-2
- **Date Handling**: date-fns with timezone support
- **Build Output**: Standalone mode for optimal deployment

### Integrations
- **Payment**: Stripe Connect for payment processing and payouts
- **Calendar**: Google Calendar API for two-way sync
- **Notifications**: SendGrid (email) and Twilio (SMS)
- **Analytics**: Built-in 6FB methodology tracking

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, Windows with WSL2
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended for production)
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection for API integrations

### Required Software
- **Python**: 3.11+ with pip
- **Node.js**: 18+ with npm
- **PostgreSQL**: 14+ (for production)
- **Git**: Latest version
- **Docker**: Optional, for containerized deployment

### Required Accounts & API Keys
- **Stripe**: Account with Connect capability
- **Google Cloud**: Project with Calendar API enabled
- **SendGrid**: Account for email notifications
- **Twilio**: Account for SMS notifications
- **Railway/Render/Vercel**: For hosting (optional)

## Environment Configuration

### Backend Environment Variables (.env)

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sixfb_booking
# For development: DATABASE_URL=sqlite:///./6fb_booking.db

# Security
SECRET_KEY=your-super-secure-secret-key-64-characters-minimum
DEBUG=false
ENVIRONMENT=production

# Application Settings
APP_NAME=6FB Booking API
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_endpoint_secret

# Google Calendar OAuth2
GOOGLE_CLIENT_ID=your-google-oauth-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/callback

# Email Notifications (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=6FB Booking

# SMS Notifications (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis (for notification queue)
REDIS_URL=redis://localhost:6379/0

# Booking Configuration
BOOKING_MIN_LEAD_TIME_MINUTES=15
BOOKING_MAX_ADVANCE_DAYS=30
BOOKING_SAME_DAY_CUTOFF=17:00

# Notification Settings
APPOINTMENT_REMINDER_HOURS=24,2
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY_SECONDS=60
```

### Frontend Environment Variables (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
# For development: NEXT_PUBLIC_API_URL=http://localhost:8000

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Monitoring (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn

# Application Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
ENVIRONMENT=production
```

### Generating Secret Keys

```bash
# Generate SECRET_KEY for backend
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Generate JWT secret (alternative method)
openssl rand -hex 32
```

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd 6fb-booking/backend-v2
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Initialize database
alembic upgrade head

# Create admin user (optional)
python create_admin_user.py
```

### 3. Frontend Setup

```bash
cd frontend-v2

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend
cd backend-v2
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd backend-v2/frontend-v2
npm run dev
```

### 5. Verify Setup

- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Health Check: http://localhost:8000/health

## Production Deployment

### Option 1: Railway Deployment (Recommended)

#### Backend Deployment

1. **Create Railway Project**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway init
```

2. **Configure Environment Variables**
```bash
# Set all required environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set SECRET_KEY="your-secret-key"
railway variables set STRIPE_SECRET_KEY="sk_live_..."
# ... add all other variables
```

3. **Deploy Backend**
```bash
# From backend-v2 directory
railway up
```

#### Frontend Deployment

1. **Configure railway.toml**
```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd backend-v2/frontend-v2 && npm install && npm run build"

[deploy]
startCommand = "cd backend-v2/frontend-v2 && node .next/standalone/server.js"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
NEXT_TELEMETRY_DISABLED = "1"
ENVIRONMENT = "production"
```

2. **Set Frontend Environment Variables**
```bash
railway variables set NEXT_PUBLIC_API_URL="https://your-backend-url"
railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

3. **Deploy Frontend**
```bash
railway up
```

### Option 2: Docker Deployment

#### Backend Container

```bash
# Build and run backend
cd backend-v2
docker build -t 6fb-backend .
docker run -d \
  --name 6fb-backend \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e SECRET_KEY="your-secret-key" \
  -e STRIPE_SECRET_KEY="sk_live_..." \
  6fb-backend
```

#### Frontend Container

```bash
# Build and run frontend
cd backend-v2/frontend-v2
docker build -t 6fb-frontend .
docker run -d \
  --name 6fb-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://api.yourdomain.com" \
  -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." \
  6fb-frontend
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend-v2
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/sixfb
      - SECRET_KEY=your-secret-key
      - STRIPE_SECRET_KEY=sk_live_...
    depends_on:
      - db
      - redis

  frontend:
    build: ./backend-v2/frontend-v2
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
    depends_on:
      - backend

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=sixfb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Option 3: Manual Server Deployment

#### Server Setup (Ubuntu 20.04+)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx (reverse proxy)
sudo apt install nginx -y

# Install Redis
sudo apt install redis-server -y
```

#### Application Deployment

```bash
# Clone repository
git clone <repository-url> /opt/6fb-booking
cd /opt/6fb-booking/backend-v2

# Setup backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd frontend-v2
npm install
npm run build

# Create systemd services
sudo cp deployment/systemd/* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable 6fb-backend 6fb-frontend
sudo systemctl start 6fb-backend 6fb-frontend
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/6fb-booking
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
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
```

## Database Setup

### PostgreSQL Setup

#### Installation & Configuration

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE sixfb_booking;
CREATE USER sixfb_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE sixfb_booking TO sixfb_user;
\q
```

#### Database Migrations

```bash
# Run migrations
cd backend-v2
source venv/bin/activate
alembic upgrade head

# Create new migration (when needed)
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

#### Database Backup & Restore

```bash
# Backup
pg_dump -U sixfb_user -h localhost sixfb_booking > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U sixfb_user -h localhost sixfb_booking < backup_file.sql
```

### SQLite (Development Only)

```bash
# Database is created automatically when running:
alembic upgrade head
```

## Build Process

### Backend Build

```bash
cd backend-v2

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Run tests
pytest

# Start production server
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend Build

```bash
cd backend-v2/frontend-v2

# Install dependencies
npm install

# Type checking
npm run lint

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

### Build Optimization

The frontend build includes several optimizations:

- **Bundle Splitting**: Automatic code splitting by route and vendor chunks
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and static asset compression
- **TypeScript**: Full type checking enabled
- **Bundle Analysis**: Use `ANALYZE=true npm run build` to analyze bundle size

## Monitoring & Health Checks

### Health Endpoints

#### Backend Health Check
```bash
curl https://api.yourdomain.com/health
# Expected response: {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}
```

#### Frontend Health Check
```bash
curl https://yourdomain.com/
# Expected: 200 OK response
```

### Application Monitoring

#### Performance Metrics Collection

```bash
# Backend performance test
cd backend-v2
python -c "
import asyncio
import httpx
import time

async def test_performance():
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        response = await client.get('http://localhost:8000/health')
        end_time = time.time()
        
        print(f'Response time: {(end_time - start_time) * 1000:.2f}ms')
        print(f'Status: {response.status_code}')

asyncio.run(test_performance())
"
```

#### Log Monitoring

```bash
# Backend logs
tail -f /var/log/6fb-backend.log

# Frontend logs (PM2 or systemd)
journalctl -u 6fb-frontend -f

# Nginx access logs
tail -f /var/log/nginx/access.log
```

### Alerting Setup

#### Basic Script Monitoring

```bash
#!/bin/bash
# health-check.sh
BACKEND_URL="https://api.yourdomain.com/health"
FRONTEND_URL="https://yourdomain.com"

# Check backend
if ! curl -f -s "$BACKEND_URL" > /dev/null; then
    echo "Backend health check failed" | mail -s "6FB Backend Down" admin@yourdomain.com
fi

# Check frontend
if ! curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "Frontend health check failed" | mail -s "6FB Frontend Down" admin@yourdomain.com
fi

# Add to crontab: */5 * * * * /path/to/health-check.sh
```

## Performance Metrics

### Current Performance Benchmarks

#### Backend Performance
- **Average Response Time**: <200ms for standard API endpoints
- **Database Query Performance**: 65% improvement through optimizations
- **Concurrent Users**: Supports 100+ concurrent connections
- **Memory Usage**: ~150MB base memory footprint
- **CPU Usage**: <5% on 2-core system under normal load

#### Frontend Performance
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3s
- **Bundle Size**: 
  - Main bundle: ~200KB gzipped
  - Vendor chunks: ~150KB gzipped
  - Total initial load: ~350KB gzipped

#### Database Performance
- **Connection Pool**: 10-20 connections configured
- **Query Performance**: Average <50ms for complex queries
- **Migration Time**: <30s for typical schema changes
- **Backup Size**: ~50MB for 1000 appointments/month

### Performance Optimization Features

1. **Database Optimizations**:
   - Strategic indexes on foreign keys and date fields
   - Query optimization with proper joins
   - Connection pooling configuration
   - Batch operations for bulk updates

2. **Frontend Optimizations**:
   - Automatic code splitting by route
   - Vendor chunk separation for better caching
   - Image optimization with Next.js
   - Progressive enhancement

3. **API Optimizations**:
   - Response caching where appropriate
   - Pagination on list endpoints
   - Efficient serialization with Pydantic
   - Rate limiting to prevent abuse

## Testing Infrastructure

### Backend Testing (43 test files, 50,489 lines)

```bash
cd backend-v2

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test categories
pytest tests/unit/          # Unit tests
pytest tests/integration/   # Integration tests
pytest tests/api/          # API endpoint tests

# Performance testing
python scripts/basic_performance_test.py
```

### Frontend Testing (213 test files)

```bash
cd backend-v2/frontend-v2

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test suites
npm test -- components/
npm test -- pages/
npm test -- lib/
```

### Test Configuration

#### Backend (pytest.ini)
```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --strict-config
    --verbose
    -ra
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    slow: Slow running tests
```

#### Frontend (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
}
```

## Troubleshooting

### Common Issues & Solutions

#### 1. Database Connection Issues

**Problem**: `sqlalchemy.exc.OperationalError: could not connect to server`

**Solutions**:
```bash
# Check PostgreSQL service
sudo systemctl status postgresql
sudo systemctl start postgresql

# Verify connection string
psql "postgresql://username:password@localhost:5432/dbname"

# Check firewall settings
sudo ufw allow 5432/tcp
```

#### 2. Frontend Build Failures

**Problem**: `npm run build` fails with TypeScript errors

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npx tsc --noEmit

# Verify environment variables
cat .env.local
```

#### 3. API CORS Issues

**Problem**: `Access-Control-Allow-Origin` errors in browser

**Solutions**:
```python
# Check ALLOWED_ORIGINS in backend config.py
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Verify CORS middleware configuration in main.py
allow_origins=allowed_origins.split(",")
```

#### 4. Stripe Integration Issues

**Problem**: Payment processing failures

**Solutions**:
```bash
# Verify Stripe keys (test vs live)
echo $STRIPE_SECRET_KEY | head -c 8  # Should show sk_test_ or sk_live_

# Check webhook endpoint
curl -X POST https://api.yourdomain.com/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verify webhook secret
stripe listen --forward-to localhost:8000/stripe/webhook
```

#### 5. Memory/Performance Issues

**Problem**: High memory usage or slow response times

**Solutions**:
```bash
# Monitor system resources
htop
free -h
df -h

# Check application logs
journalctl -u 6fb-backend -n 100
journalctl -u 6fb-frontend -n 100

# Restart services
sudo systemctl restart 6fb-backend
sudo systemctl restart 6fb-frontend
```

#### 6. Database Migration Issues

**Problem**: Alembic migration failures

**Solutions**:
```bash
# Check current migration state
alembic current

# Show migration history
alembic history

# Force migration to specific revision
alembic upgrade head --sql  # Preview SQL first
alembic upgrade head

# Rollback problematic migration
alembic downgrade -1
```

### Debug Mode Setup

#### Backend Debug Mode
```bash
# Enable debug mode in .env
DEBUG=true
LOG_LEVEL=DEBUG

# Run with debug logging
uvicorn main:app --reload --log-level debug
```

#### Frontend Debug Mode
```bash
# Enable debug mode
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true

# Run with debug output
npm run dev
```

### Log Analysis

#### Backend Logs
```bash
# View recent errors
grep -E "(ERROR|CRITICAL)" /var/log/6fb-backend.log | tail -20

# Monitor API requests
grep "POST\|PUT\|DELETE" /var/log/6fb-backend.log | tail -20

# Database query logging
grep "SELECT\|INSERT\|UPDATE\|DELETE" /var/log/6fb-backend.log | tail -10
```

#### Frontend Logs
```bash
# Check Next.js build logs
cat .next/trace

# Monitor browser console errors (in development)
# Open browser dev tools and check console
```

## Rollback Procedures

### Application Rollback

#### Git-based Rollback
```bash
# Identify last known good commit
git log --oneline -10

# Create rollback branch
git checkout -b rollback-$(date +%Y%m%d-%H%M%S)

# Revert to specific commit
git reset --hard COMMIT_HASH

# Deploy rollback
railway up  # or your deployment method
```

#### Database Rollback
```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade REVISION_ID

# View migration history
alembic history
```

#### Service Rollback
```bash
# Stop current services
sudo systemctl stop 6fb-backend 6fb-frontend

# Restore from backup
cp -r /opt/6fb-booking-backup/* /opt/6fb-booking/

# Restart services
sudo systemctl start 6fb-backend 6fb-frontend
```

### Emergency Procedures

#### Complete System Restore
```bash
# 1. Stop all services
sudo systemctl stop 6fb-backend 6fb-frontend nginx

# 2. Restore database from backup
psql -U sixfb_user -h localhost sixfb_booking < latest_backup.sql

# 3. Restore application from backup
rm -rf /opt/6fb-booking
cp -r /opt/6fb-booking-backup /opt/6fb-booking

# 4. Restart services
sudo systemctl start 6fb-backend 6fb-frontend nginx

# 5. Verify functionality
curl https://api.yourdomain.com/health
curl https://yourdomain.com
```

#### Partial Service Recovery
```bash
# Backend only recovery
sudo systemctl stop 6fb-backend
cd /opt/6fb-booking/backend-v2
git reset --hard LAST_GOOD_COMMIT
sudo systemctl start 6fb-backend

# Frontend only recovery
sudo systemctl stop 6fb-frontend
cd /opt/6fb-booking/backend-v2/frontend-v2
git reset --hard LAST_GOOD_COMMIT
npm run build
sudo systemctl start 6fb-frontend
```

### Backup Strategy

#### Automated Backups
```bash
#!/bin/bash
# backup.sh - Run daily via cron

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/6fb-booking"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump -U sixfb_user -h localhost sixfb_booking > "$BACKUP_DIR/db_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /opt/6fb-booking

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

#### Add to crontab
```bash
# Run daily at 2 AM
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

## Security Considerations

### Environment Security
- Never commit `.env` files to version control
- Use environment-specific secrets (separate dev/staging/prod)
- Rotate secrets regularly (quarterly recommended)
- Use strong, unique passwords for all services

### API Security
- All endpoints require authentication except public booking
- Rate limiting on all endpoints (100 requests/minute default)
- CORS properly configured for production domains
- SQL injection protection via SQLAlchemy ORM
- Input validation on all endpoints via Pydantic

### Database Security
- Database user has minimal required permissions
- Regular backups with encryption
- Database access restricted to application servers
- Connection strings stored as environment variables

### Deployment Security
- Applications run as non-root users
- TLS/SSL certificates properly configured
- Security headers configured in Nginx
- Regular security updates applied

## Maintenance & Updates

### Regular Maintenance Tasks

#### Weekly
- Monitor disk space and clean logs
- Review error logs for issues
- Check backup integrity
- Monitor performance metrics

#### Monthly
- Update dependencies (security patches)
- Review and rotate API keys
- Database maintenance (VACUUM, ANALYZE)
- Performance analysis and optimization

#### Quarterly
- Full security audit
- Disaster recovery testing
- Dependency version updates
- Infrastructure capacity planning

### Update Procedures

#### Backend Updates
```bash
cd backend-v2

# Update dependencies
pip install -r requirements.txt --upgrade

# Run tests
pytest

# Apply database migrations if any
alembic upgrade head

# Restart service
sudo systemctl restart 6fb-backend
```

#### Frontend Updates
```bash
cd backend-v2/frontend-v2

# Update dependencies
npm update

# Run tests
npm test

# Build and deploy
npm run build
sudo systemctl restart 6fb-frontend
```

## Support & Documentation

### API Documentation
- **Swagger UI**: https://api.yourdomain.com/docs
- **ReDoc**: https://api.yourdomain.com/redoc
- **OpenAPI Spec**: https://api.yourdomain.com/openapi.json

### Additional Resources
- **Repository**: Link to source code repository
- **Issue Tracker**: For bug reports and feature requests
- **Development Guidelines**: CLAUDE.md in repository root
- **Architecture Documentation**: See README.md files in respective directories

### Getting Help
1. Check this documentation first
2. Review application logs for error details
3. Search existing issues in the repository
4. Create detailed bug report with reproduction steps
5. Include relevant log excerpts and system information

---

**Last Updated**: 2025-06-29
**Version**: 2.0.0
**Deployment Ready**: ✅ Phase 8 Complete