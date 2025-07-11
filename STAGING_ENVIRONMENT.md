# 6FB Booking Platform - Staging Environment Guide

## Overview

The staging environment is a production-like environment used for testing features, integration testing, and final validation before production deployment. It mirrors the production setup but uses test services and isolated data.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Architecture](#environment-architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Data Management](#data-management)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Access to staging server (if deploying remotely)
- Environment configuration files

### Local Staging Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd 6fb-booking
   ```

2. **Configure environment variables:**
   ```bash
   cp backend-v2/.env.staging backend-v2/.env.staging.local
   cp backend-v2/frontend-v2/.env.staging backend-v2/frontend-v2/.env.staging.local
   # Edit the .local files with your specific values
   ```

3. **Start staging environment:**
   ```bash
   # Basic staging setup
   docker-compose -f docker-compose.staging.yml up -d

   # With monitoring
   docker-compose -f docker-compose.staging.yml --profile monitoring up -d

   # With background jobs
   docker-compose -f docker-compose.staging.yml --profile celery up -d
   ```

4. **Run database migrations and seed data:**
   ```bash
   # Run migrations
   docker-compose -f docker-compose.staging.yml --profile migration up db-migration-staging

   # Seed test data
   docker-compose -f docker-compose.staging.yml exec backend-staging python scripts/seed_staging_data.py
   ```

5. **Verify deployment:**
   ```bash
   ./scripts/staging-health-check.sh
   ```

### Automated Deployment

Use the deployment script for automated setup:

```bash
# Interactive deployment
./scripts/deploy-staging.sh

# Force deployment with monitoring
./scripts/deploy-staging.sh -f -m

# Dry run to see what would be deployed
./scripts/deploy-staging.sh --dry-run

# Deploy with test data seeding
./scripts/deploy-staging.sh --seed-data
```

## Environment Architecture

### Services Overview

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| Backend API | 8001 | FastAPI application | `/health` |
| Frontend | 3001 | Next.js application | `/api/health` |
| PostgreSQL | 5433 | Primary database | `pg_isready` |
| Redis | 6380 | Caching and sessions | `redis-cli ping` |
| Mailhog | 8025 | Email testing | Web UI |
| Nginx | 8080/8443 | Reverse proxy | `/health` |

### Service Dependencies

```mermaid
graph TD
    A[Frontend] --> B[Backend API]
    B --> C[PostgreSQL]
    B --> D[Redis]
    B --> E[Mailhog]
    F[Nginx] --> A
    F --> B
    G[Celery Worker] --> D
    G --> C
    H[Celery Beat] --> D
```

### Network Configuration

- Network: `6fb-staging-network` (172.20.0.0/16)
- All services communicate through Docker internal network
- External access through mapped ports

## Configuration

### Environment Comparison

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Database | SQLite | PostgreSQL | PostgreSQL |
| Redis | Optional | Required | Required |
| Email | Console | Mailhog | SendGrid |
| Payments | Test Keys | Test Keys | Live Keys |
| SSL | No | Optional | Required |
| Logging | DEBUG | INFO | WARNING |
| Monitoring | Basic | Enhanced | Full |

### Key Configuration Files

1. **Backend Configuration**
   - `backend-v2/.env.staging` - Main backend environment
   - `backend-v2/Dockerfile.staging` - Staging-specific Docker build
   - `backend-v2/docker-entrypoint.staging.sh` - Startup script

2. **Frontend Configuration**
   - `backend-v2/frontend-v2/.env.staging` - Frontend environment variables
   - `backend-v2/frontend-v2/Dockerfile.staging` - Staging Docker build

3. **Infrastructure Configuration**
   - `docker-compose.staging.yml` - Service orchestration
   - `redis/redis.staging.conf` - Redis configuration
   - `nginx/nginx.staging.conf` - Reverse proxy config

### Environment Variables

#### Critical Backend Variables

```bash
# Environment
ENVIRONMENT=staging
DEBUG=false

# Database
DATABASE_URL=postgresql://staging_user:password@postgres-staging:5432/6fb_booking_staging

# Security
SECRET_KEY=staging-secret-key-64-chars-minimum
STRIPE_SECRET_KEY=sk_test_...

# External Services
REDIS_URL=redis://redis-staging:6379/0
SMTP_SERVER=mailhog
```

#### Critical Frontend Variables

```bash
# Environment
NEXT_PUBLIC_ENVIRONMENT=staging
NODE_ENV=production

# API
NEXT_PUBLIC_API_URL=https://api-staging.6fbplatform.com/api/v1

# External Services
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Deployment

### Manual Deployment

1. **Prepare deployment:**
   ```bash
   # Check git status
   git status

   # Create backup
   ./scripts/staging-data-sync.sh --backup-first
   ```

2. **Deploy services:**
   ```bash
   # Deploy with script
   ./scripts/deploy-staging.sh -f

   # Or manually
   docker-compose -f docker-compose.staging.yml down
   docker-compose -f docker-compose.staging.yml pull
   docker-compose -f docker-compose.staging.yml up -d
   ```

3. **Verify deployment:**
   ```bash
   # Run health checks
   ./scripts/staging-health-check.sh

   # Check service status
   docker-compose -f docker-compose.staging.yml ps
   ```

### CI/CD Deployment

Staging deployments are automatically triggered by:

- Pushes to `develop` branch
- Pushes to `staging` branch
- Feature branches (optional)
- Pull requests (for preview deployments)

#### GitHub Actions Workflow

The CI/CD pipeline includes:

1. **Build & Test** - Run tests and build Docker images
2. **Deploy** - Deploy to staging server
3. **Migrate** - Run database migrations
4. **Seed** - Add test data
5. **Health Check** - Verify deployment
6. **Performance Test** - Basic performance validation
7. **Notify** - Send deployment notifications

#### Required Secrets

Configure these in GitHub repository settings:

```bash
STAGING_HOST=staging.6fbplatform.com
STAGING_USER=deploy
STAGING_SSH_KEY=<private-ssh-key>
SLACK_WEBHOOK_STAGING=<slack-webhook-url>
```

## Testing

### Test Data

The staging environment includes realistic test data:

- 25 test users (admin, barbers, clients)
- 5 test locations
- 200 sample appointments
- 150 payment records
- 100 notifications
- Analytics data spanning 90 days

### Test User Accounts

| Role | Email | Purpose |
|------|-------|---------|
| Admin | staging-admin@6fbplatform.com | Administrative testing |
| Barber | test-barber-1@staging.6fbplatform.com | Barber workflow testing |
| Client | test-client-1@staging.6fbplatform.com | Client booking testing |

### Testing Workflows

1. **API Testing**
   ```bash
   # Test API endpoints
   curl -f https://api-staging.6fbplatform.com/health
   curl -f https://api-staging.6fbplatform.com/docs
   ```

2. **Frontend Testing**
   ```bash
   # Test frontend
   curl -f https://staging.6fbplatform.com
   ```

3. **End-to-End Testing**
   ```bash
   # Run comprehensive tests
   npm run test:e2e:staging
   ```

4. **Performance Testing**
   ```bash
   # Run performance tests
   docker-compose -f docker-compose.staging.yml exec backend-staging \
     python scripts/simplified_performance_test.py
   ```

### Email Testing

Mailhog captures all outgoing emails for testing:

- **Web Interface:** http://localhost:8025
- **API:** http://localhost:8025/api/v2/messages
- **SMTP:** localhost:1025

## Monitoring

### Health Monitoring

1. **Service Health**
   ```bash
   # Check all services
   ./scripts/staging-health-check.sh

   # Quick health check
   ./scripts/staging-health-check.sh --quick

   # API only
   ./scripts/staging-health-check.sh --api-only
   ```

2. **Application Monitoring**
   - Sentry error tracking (staging environment)
   - Performance monitoring enabled
   - Custom metrics collection

### Monitoring Stack (Optional)

Enable with `--profile monitoring`:

- **Prometheus** - Metrics collection (port 9090)
- **Grafana** - Visualization dashboard (port 3000)
- **Health dashboards** - Pre-configured staging dashboards

### Log Management

1. **Service Logs**
   ```bash
   # View all logs
   docker-compose -f docker-compose.staging.yml logs -f

   # Specific service
   docker-compose -f docker-compose.staging.yml logs -f backend-staging

   # Application logs
   docker-compose -f docker-compose.staging.yml exec backend-staging tail -f logs/staging.log
   ```

2. **Log Levels**
   - Backend: INFO level (configurable)
   - Frontend: Production build with source maps
   - Database: Standard PostgreSQL logging

## Data Management

### Database Management

1. **Database Access**
   ```bash
   # Connect to staging database
   docker-compose -f docker-compose.staging.yml exec postgres-staging \
     psql -U staging_user -d 6fb_booking_staging
   ```

2. **Backup & Restore**
   ```bash
   # Create backup
   docker-compose -f docker-compose.staging.yml exec postgres-staging \
     pg_dump -U staging_user 6fb_booking_staging > staging_backup.sql

   # Restore backup
   docker-compose -f docker-compose.staging.yml exec -T postgres-staging \
     psql -U staging_user 6fb_booking_staging < staging_backup.sql
   ```

3. **Data Synchronization**
   ```bash
   # Sync anonymized production data
   ./scripts/staging-data-sync.sh -a -s

   # Use test data only
   ./scripts/staging-data-sync.sh --test-data
   ```

### Data Privacy

**Important:** Staging environment uses:
- Anonymized data from production (when synced)
- Test payment methods only
- Fake email addresses for notifications
- Test phone numbers for SMS

Never use real customer data in staging!

### Cache Management

1. **Redis Operations**
   ```bash
   # Connect to Redis
   docker-compose -f docker-compose.staging.yml exec redis-staging redis-cli

   # Clear cache
   docker-compose -f docker-compose.staging.yml exec redis-staging redis-cli FLUSHDB

   # Monitor Redis
   docker-compose -f docker-compose.staging.yml exec redis-staging redis-cli MONITOR
   ```

## Troubleshooting

### Common Issues

1. **Services Won't Start**
   ```bash
   # Check service status
   docker-compose -f docker-compose.staging.yml ps

   # View service logs
   docker-compose -f docker-compose.staging.yml logs [service-name]

   # Restart specific service
   docker-compose -f docker-compose.staging.yml restart [service-name]
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose -f docker-compose.staging.yml exec postgres-staging pg_isready

   # Check database logs
   docker-compose -f docker-compose.staging.yml logs postgres-staging

   # Reset database
   docker-compose -f docker-compose.staging.yml down -v
   docker-compose -f docker-compose.staging.yml up -d
   ```

3. **Performance Issues**
   ```bash
   # Check resource usage
   docker stats

   # Check disk space
   df -h
   docker system df

   # Clean up
   docker system prune -f --volumes
   ```

### Debug Mode

Enable debug features for troubleshooting:

```bash
# Set debug environment variables
export ENABLE_DEBUG_ENDPOINTS=true
export ENABLE_PERFORMANCE_MONITORING=true

# Restart services
docker-compose -f docker-compose.staging.yml restart
```

### Recovery Procedures

1. **Service Recovery**
   ```bash
   # Quick restart
   docker-compose -f docker-compose.staging.yml restart

   # Full redeploy
   ./scripts/deploy-staging.sh -f --reset-db
   ```

2. **Database Recovery**
   ```bash
   # Restore from backup
   BACKUP_DIR=$(cat /tmp/6fb-staging-backup-latest)
   docker-compose -f docker-compose.staging.yml exec -T postgres-staging \
     psql -U staging_user 6fb_booking_staging < "$BACKUP_DIR/staging-db-backup.sql"
   ```

## Best Practices

### Development Workflow

1. **Feature Testing**
   - Deploy feature branches to staging for testing
   - Use staging for integration testing
   - Validate with realistic test data

2. **Data Management**
   - Refresh staging data weekly
   - Always use anonymized data
   - Test with realistic data volumes

3. **Performance Testing**
   - Run performance tests on staging
   - Monitor resource usage
   - Test under load before production

### Security Practices

1. **Access Control**
   - Limit staging access to development team
   - Use separate credentials from production
   - Enable audit logging

2. **Data Protection**
   - Never use production customer data
   - Anonymize all sensitive information
   - Regular security scans

3. **Environment Isolation**
   - Separate staging and production networks
   - Use test API keys for external services
   - Monitor for configuration drift

### Maintenance

1. **Regular Tasks**
   - Weekly data refresh
   - Monthly security updates
   - Quarterly dependency updates

2. **Monitoring**
   - Set up staging-specific alerts
   - Monitor resource usage trends
   - Track deployment success rates

3. **Documentation**
   - Keep runbooks updated
   - Document configuration changes
   - Maintain test case documentation

## Service URLs

### Staging Environment

- **Frontend:** https://staging.6fbplatform.com
- **API:** https://api-staging.6fbplatform.com
- **API Docs:** https://api-staging.6fbplatform.com/docs
- **Health Check:** https://api-staging.6fbplatform.com/health

### Development Tools

- **Mailhog:** http://staging.6fbplatform.com:8025
- **Grafana:** http://staging.6fbplatform.com:3000 (if monitoring enabled)
- **Prometheus:** http://staging.6fbplatform.com:9090 (if monitoring enabled)

### Local Development

- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:8001
- **Database:** localhost:5433
- **Redis:** localhost:6380
- **Mailhog:** http://localhost:8025

## Support

### Getting Help

1. **Documentation**
   - Check this guide first
   - Review Docker Compose logs
   - Check application-specific documentation

2. **Debug Information**
   ```bash
   # Generate debug report
   ./scripts/staging-health-check.sh -v > staging-debug.txt

   # Check system resources
   docker system df
   docker stats --no-stream
   ```

3. **Contact**
   - Development team Slack channel
   - Create GitHub issue for bugs
   - Check existing documentation

### Useful Commands

```bash
# Quick status check
docker-compose -f docker-compose.staging.yml ps

# View all logs
docker-compose -f docker-compose.staging.yml logs -f

# Restart all services
docker-compose -f docker-compose.staging.yml restart

# Clean deployment
docker-compose -f docker-compose.staging.yml down -v
./scripts/deploy-staging.sh -f --seed-data

# Export staging data
./scripts/staging-data-sync.sh --backup-first

# Performance test
./scripts/staging-health-check.sh && \
docker-compose -f docker-compose.staging.yml exec backend-staging \
  python scripts/simplified_performance_test.py
```

---

**Last Updated:** $(date +%Y-%m-%d)
**Version:** 1.0
**Environment:** Staging
