# 6FB Booking Platform - Production Deployment Strategy

*Created: 2025-06-23*

## Executive Summary

This document outlines a comprehensive deployment strategy for the 6FB Booking Platform, including platform comparison, database migration, CI/CD setup, and operational procedures.

**Recommended Platform**: DigitalOcean App Platform
**Estimated Timeline**: 5-7 days for complete deployment
**Total Estimated Cost**: $75-150/month for production workload

## 1. Hosting Platform Comparison

### Option A: Render (Recommended for Quick Start)
**Pros:**
- Zero-DevOps deployment
- Automatic SSL certificates
- Built-in CI/CD from GitHub
- Managed PostgreSQL included
- Automatic scaling
- Free tier available for testing

**Cons:**
- Limited customization options
- Higher cost at scale ($25/service minimum)
- Cold starts on free tier
- Limited regions (US/EU only)

**Pricing:**
- Web Service: $25/month (starter)
- PostgreSQL: $25/month (starter)
- Redis: $25/month
- **Total: ~$75/month**

### Option B: DigitalOcean App Platform (RECOMMENDED)
**Pros:**
- Balance of simplicity and control
- Competitive pricing
- Good performance
- Multiple regions available
- Integrated monitoring
- Spaces for file storage
- Kubernetes option for future

**Cons:**
- Slightly more setup than Render
- Manual database backups setup

**Pricing:**
- App Platform (2 services): $24/month
- Managed PostgreSQL: $15/month
- Spaces (object storage): $5/month
- Load Balancer: $12/month
- **Total: ~$56/month**

### Option C: AWS (For Enterprise Scale)
**Pros:**
- Ultimate flexibility and scale
- Global infrastructure
- Advanced services (RDS, ElastiCache, CloudFront)
- Enterprise-grade security
- Auto-scaling groups

**Cons:**
- Complex setup and management
- Steep learning curve
- Higher operational overhead
- Cost can escalate quickly

**Pricing:**
- EC2 (t3.medium): $30/month
- RDS PostgreSQL: $30/month
- ALB: $20/month
- CloudFront: $10/month
- S3: $5/month
- **Total: ~$95/month (minimum)**

## 2. Database Migration Plan (SQLite to PostgreSQL)

### Phase 1: Pre-Migration Preparation (Day 1)
```bash
# 1. Install PostgreSQL locally
brew install postgresql@15  # macOS
# or
sudo apt-get install postgresql-15  # Ubuntu

# 2. Create local PostgreSQL database
createdb 6fb_booking_dev

# 3. Update local .env
DATABASE_URL=postgresql://localhost/6fb_booking_dev

# 4. Test application with PostgreSQL locally
cd backend
alembic upgrade head
python scripts/seed_booking_data.py
uvicorn main:app --reload
```

### Phase 2: Schema Migration (Day 1-2)
```python
# backend/scripts/migrate_to_postgres.py
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime

def migrate_data():
    # Connect to SQLite
    sqlite_conn = sqlite3.connect('6fb_booking.db')
    sqlite_conn.row_factory = sqlite3.Row
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(os.getenv('POSTGRES_URL'))
    pg_cursor = pg_conn.cursor()
    
    # Tables in order of dependencies
    tables = [
        'locations', 'users', 'barbers', 'clients',
        'service_categories', 'services', 'barber_services',
        'barber_availability', 'appointments', 'payments',
        'booking_rules', 'reviews', 'booking_slots', 'wait_lists'
    ]
    
    for table in tables:
        print(f"Migrating {table}...")
        migrate_table(sqlite_conn, pg_conn, table)
    
    pg_conn.commit()
    print("Migration completed successfully!")
```

### Phase 3: Data Validation (Day 2)
```bash
# Run validation script
python scripts/validate_migration.py

# Check row counts
psql 6fb_booking_prod -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;"
```

## 3. CI/CD Pipeline Setup

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install backend dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run backend tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
        SECRET_KEY: ${{ secrets.SECRET_KEY }}
        JWT_SECRET_KEY: ${{ secrets.JWT_SECRET_KEY }}
      run: |
        cd backend
        pytest --cov=. --cov-report=xml
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to DigitalOcean
      uses: digitalocean/action-doctl@v2
      with:
        token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
    
    - name: Build and push Docker images
      run: |
        # Build backend
        docker build -t registry.digitalocean.com/6fb-booking/backend:${{ github.sha }} ./backend
        docker push registry.digitalocean.com/6fb-booking/backend:${{ github.sha }}
        
        # Build frontend
        docker build -t registry.digitalocean.com/6fb-booking/frontend:${{ github.sha }} ./frontend
        docker push registry.digitalocean.com/6fb-booking/frontend:${{ github.sha }}
    
    - name: Deploy to App Platform
      run: |
        doctl apps update ${{ secrets.APP_ID }} --spec .do/app.yaml
```

### DigitalOcean App Spec
```yaml
# .do/app.yaml
name: 6fb-booking
region: nyc
features:
  - buildpack-stack=ubuntu-22

services:
  - name: backend
    dockerfile_path: backend/Dockerfile
    source_dir: backend
    github:
      branch: main
      deploy_on_push: true
      repo: your-org/6fb-booking
    http_port: 8000
    instance_count: 2
    instance_size_slug: professional-xs
    routes:
      - path: /api
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_TIME
        value: ${redis.REDIS_URL}
      - key: SECRET_KEY
        scope: RUN_TIME
        type: SECRET
      - key: STRIPE_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
    health_check:
      http_path: /health
      initial_delay_seconds: 20
      period_seconds: 10

  - name: frontend
    dockerfile_path: frontend/Dockerfile
    source_dir: frontend
    github:
      branch: main
      deploy_on_push: true
      repo: your-org/6fb-booking
    http_port: 3000
    instance_count: 2
    instance_size_slug: professional-xs
    routes:
      - path: /
    envs:
      - key: NEXT_PUBLIC_API_URL
        scope: BUILD_TIME
        value: ${APP_URL}/api
    health_check:
      http_path: /api/health
      initial_delay_seconds: 20
      period_seconds: 10

databases:
  - name: db
    engine: PG
    version: "15"
    size: db-s-1vcpu-1gb
    num_nodes: 1

jobs:
  - name: migrate
    kind: PRE_DEPLOY
    github:
      branch: main
      deploy_on_push: true
      repo: your-org/6fb-booking
    dockerfile_path: backend/Dockerfile
    source_dir: backend
    run_command: alembic upgrade head
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
```

## 4. Environment Configuration

### Production Environment Variables
```bash
# backend/.env.production
# Security
SECRET_KEY=${SECRET_KEY}  # Generate with: openssl rand -hex 32
JWT_SECRET_KEY=${JWT_SECRET_KEY}  # Generate with: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=${DATABASE_URL}  # Provided by DigitalOcean
REDIS_URL=${REDIS_URL}  # For caching and sessions

# Stripe Production
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}  # sk_live_...
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}  # pk_live_...
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}  # whsec_...
STRIPE_CONNECT_CLIENT_ID=${STRIPE_CONNECT_CLIENT_ID}  # ca_...

# Email (SendGrid for production)
SENDGRID_API_KEY=${SENDGRID_API_KEY}
EMAIL_FROM=noreply@6fbooking.com

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
GOOGLE_ANALYTICS_ID=${GOOGLE_ANALYTICS_ID}

# CORS
FRONTEND_URL=https://6fbooking.com
ALLOWED_ORIGINS=["https://6fbooking.com", "https://www.6fbooking.com"]
ENVIRONMENT=production

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60

# frontend/.env.production
NEXT_PUBLIC_API_URL=https://api.6fbooking.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=${GOOGLE_ANALYTICS_ID}
NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
```

### Security Headers Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name 6fbooking.com www.6fbooking.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 6fbooking.com www.6fbooking.com;
    
    ssl_certificate /etc/letsencrypt/live/6fbooking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/6fbooking.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com" always;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. Monitoring and Logging Setup

### Sentry Configuration
```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

if settings.ENVIRONMENT == "production":
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
    )
```

### Logging Configuration
```python
# backend/config/logging_config.py
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "json": {
            "format": "%(asctime)s",
            "class": "pythonjsonlogger.jsonlogger.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/6fb-booking/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "formatter": "json",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"],
    },
}
```

### Monitoring Dashboard
```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-clock-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3001:3000"
  
  node_exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
  
  postgres_exporter:
    image: wrouesnel/postgres_exporter:latest
    environment:
      DATA_SOURCE_NAME: ${DATABASE_URL}
    ports:
      - "9187:9187"

volumes:
  prometheus_data:
  grafana_data:
```

### Health Check Endpoints
```python
# backend/api/v1/endpoints/health.py
@router.get("/health")
async def health_check():
    checks = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": await check_database(),
        "redis": await check_redis(),
        "stripe": await check_stripe(),
        "email": await check_email_service(),
    }
    
    # Determine overall health
    if all(check["status"] == "healthy" for check in checks.values() if isinstance(check, dict)):
        return JSONResponse(content=checks, status_code=200)
    else:
        return JSONResponse(content=checks, status_code=503)

@router.get("/health/detailed")
async def detailed_health_check(current_user: User = Depends(get_current_admin)):
    return {
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
        },
        "application": {
            "active_connections": len(active_connections),
            "request_rate": get_request_rate(),
            "error_rate": get_error_rate(),
            "response_time_avg": get_avg_response_time(),
        },
        "database": {
            "pool_size": db.pool.size(),
            "pool_checked_in": db.pool.checkedin(),
            "pool_overflow": db.pool.overflow(),
            "slow_queries": get_slow_queries_count(),
        },
    }
```

## 6. Rollback Procedures

### Automated Rollback Strategy
```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to (git SHA)'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
    - name: Rollback Backend
      run: |
        doctl apps create-deployment ${{ secrets.APP_ID }} \
          --component backend \
          --git-commit-sha ${{ github.event.inputs.version }}
    
    - name: Rollback Frontend
      run: |
        doctl apps create-deployment ${{ secrets.APP_ID }} \
          --component frontend \
          --git-commit-sha ${{ github.event.inputs.version }}
    
    - name: Verify Rollback
      run: |
        sleep 60
        curl -f https://api.6fbooking.com/health || exit 1
        curl -f https://6fbooking.com/api/health || exit 1
```

### Manual Rollback Procedures
```bash
# 1. Database Rollback (if schema changed)
cd backend
alembic downgrade -1  # Rollback one migration

# 2. Quick Service Rollback (DigitalOcean)
doctl apps list-deployments <app-id>
doctl apps create-deployment <app-id> --component backend --git-commit-sha <previous-sha>

# 3. Full Environment Rollback
# Tag current version before deploying
git tag -a v1.0.0-backup -m "Backup before deployment"
git push origin v1.0.0-backup

# Rollback to tagged version
git checkout v1.0.0-backup
./scripts/deploy.sh --emergency
```

### Database Backup Strategy
```bash
# Automated daily backups
# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="6fb_booking"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3/Spaces
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://6fb-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup successful: backup_$DATE.sql.gz"
    # Send success notification
else
    echo "Backup failed!"
    # Send alert
fi
```

## 7. Deployment Timeline

### Day 1: Infrastructure Setup
- [ ] Create DigitalOcean account and project
- [ ] Set up GitHub repository secrets
- [ ] Configure domain DNS
- [ ] Create managed PostgreSQL database
- [ ] Set up Spaces for file storage

### Day 2: Database Migration
- [ ] Run local PostgreSQL tests
- [ ] Execute migration script
- [ ] Validate data integrity
- [ ] Set up database backups

### Day 3: CI/CD Pipeline
- [ ] Configure GitHub Actions
- [ ] Set up Docker registry
- [ ] Create deployment workflows
- [ ] Test automated deployments

### Day 4: Application Deployment
- [ ] Deploy backend service
- [ ] Deploy frontend service
- [ ] Configure load balancer
- [ ] Set up SSL certificates
- [ ] Test full application flow

### Day 5: Monitoring Setup
- [ ] Configure Sentry
- [ ] Set up Grafana dashboards
- [ ] Configure alerts
- [ ] Test monitoring systems

### Day 6: Security & Performance
- [ ] Run security audit
- [ ] Configure WAF rules
- [ ] Set up CDN
- [ ] Performance testing
- [ ] Load testing

### Day 7: Go Live
- [ ] Final testing checklist
- [ ] Update DNS records
- [ ] Monitor initial traffic
- [ ] Team training on procedures
- [ ] Documentation review

## 8. Post-Deployment Checklist

### Immediate (First 24 hours)
- [ ] Monitor error rates
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Review performance metrics
- [ ] Check SSL certificate

### Week 1
- [ ] Analyze user behavior
- [ ] Review security logs
- [ ] Optimize slow queries
- [ ] Adjust rate limits
- [ ] Update documentation

### Month 1
- [ ] Performance audit
- [ ] Cost optimization
- [ ] Feature usage analysis
- [ ] Security penetration test
- [ ] Disaster recovery test

## 9. Emergency Contacts

### Technical Support
- **DigitalOcean Support**: support@digitalocean.com
- **Stripe Support**: support@stripe.com
- **SendGrid Support**: support@sendgrid.com

### Internal Team
- **DevOps Lead**: [Contact]
- **Backend Lead**: [Contact]
- **Frontend Lead**: [Contact]
- **On-Call Engineer**: [Rotation Schedule]

## 10. Cost Summary

### Monthly Operational Costs
- **Hosting (DigitalOcean)**: $56
- **Domain & SSL**: $15
- **Email (SendGrid)**: $15
- **Monitoring (Sentry)**: $26
- **Backups & Storage**: $10
- **CDN (Cloudflare)**: $20
- **Total**: ~$142/month

### One-Time Costs
- **Domain Registration**: $15/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Development Time**: 5-7 days
- **Security Audit**: $500-1000

## Conclusion

This deployment strategy provides a robust, scalable foundation for the 6FB Booking Platform. The recommended DigitalOcean App Platform offers the best balance of simplicity, cost, and features for this application's needs.

Key success factors:
1. Thorough testing at each stage
2. Comprehensive monitoring from day one
3. Clear rollback procedures
4. Regular backups and security audits
5. Performance optimization based on real usage

The platform is designed to scale from initial launch to thousands of daily bookings without major architectural changes.