# 6FB Booking Platform - Environment Comparison

## Environment Overview

| Feature | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Purpose** | Local development | Pre-production testing | Live customer service |
| **Data** | Mock/minimal data | Anonymized test data | Real customer data |
| **Security** | Relaxed | Test credentials | Full security |
| **Performance** | Not optimized | Production-like | Fully optimized |
| **Monitoring** | Basic logging | Enhanced monitoring | Full observability |

## Service Configuration

### Database

| Environment | Engine | Host | Port | Database Name |
|-------------|--------|------|------|---------------|
| Development | SQLite | Local file | N/A | `6fb_booking.db` |
| Staging | PostgreSQL | postgres-staging | 5433 | `6fb_booking_staging` |
| Production | PostgreSQL | prod-db-cluster | 5432 | `6fb_booking_production` |

### Redis Cache

| Environment | Host | Port | Database | Usage |
|-------------|------|------|----------|-------|
| Development | localhost | 6379 | 0 | Optional caching |
| Staging | redis-staging | 6380 | 0 | Session + cache |
| Production | redis-cluster | 6379 | 0 | Full caching |

### Email Service

| Environment | Service | Purpose | Configuration |
|-------------|---------|---------|---------------|
| Development | Console | Debug output | Logs to terminal |
| Staging | Mailhog | Email testing | Web UI at :8025 |
| Production | SendGrid | Real emails | API integration |

### Payment Processing

| Environment | Service | Keys | Webhooks |
|-------------|---------|------|----------|
| Development | Stripe Test | `sk_test_...` | Local tunnel |
| Staging | Stripe Test | `sk_test_...` | Staging webhooks |
| Production | Stripe Live | `sk_live_...` | Production webhooks |

## URL Structure

### Development (Local)
```
Frontend:    http://localhost:3000
Backend:     http://localhost:8000
API Docs:    http://localhost:8000/docs
Health:      http://localhost:8000/health
Database:    localhost:5432 (if PostgreSQL)
Redis:       localhost:6379
```

### Staging
```
Frontend:    https://staging.6fbplatform.com
Backend:     https://api-staging.6fbplatform.com
API Docs:    https://api-staging.6fbplatform.com/docs
Health:      https://api-staging.6fbplatform.com/health
Mailhog:     https://staging.6fbplatform.com:8025
Monitoring:  https://staging.6fbplatform.com:3000 (Grafana)
```

### Production
```
Frontend:    https://6fbplatform.com
Backend:     https://api.6fbplatform.com
API Docs:    https://api.6fbplatform.com/docs (restricted)
Health:      https://api.6fbplatform.com/health
Admin:       https://admin.6fbplatform.com
Status:      https://status.6fbplatform.com
```

## Environment Variables

### Backend Configuration

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `ENVIRONMENT` | development | staging | production |
| `DEBUG` | true | false | false |
| `LOG_LEVEL` | DEBUG | INFO | WARNING |
| `DATABASE_URL` | sqlite:///./6fb_booking.db | postgresql://... | postgresql://... |
| `SECRET_KEY` | dev-key | staging-key-64-chars | prod-key-64-chars |
| `STRIPE_SECRET_KEY` | sk_test_... | sk_test_... | sk_live_... |
| `CORS_ORIGINS` | ["http://localhost:3000"] | ["https://staging..."] | ["https://6fbplatform.com"] |

### Frontend Configuration

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | development | production | production |
| `NEXT_PUBLIC_ENVIRONMENT` | development | staging | production |
| `NEXT_PUBLIC_API_URL` | http://localhost:8000/api/v1 | https://api-staging.../api/v1 | https://api.../api/v1 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pk_test_... | pk_test_... | pk_live_... |

## Deployment Methods

### Development
```bash
# Start development servers
npm run dev                    # Frontend
uvicorn main:app --reload     # Backend

# Or with Docker
docker-compose up -d
```

### Staging
```bash
# Automated deployment
./scripts/deploy-staging.sh

# Manual deployment
docker-compose -f docker-compose.staging.yml up -d

# CI/CD deployment
git push origin develop  # Triggers staging deployment
```

### Production
```bash
# Automated deployment (main branch only)
./scripts/deploy-production.sh

# CI/CD deployment
git push origin main  # Triggers production deployment
```

## Data Management

### Development
- **Source:** Mock data, manual seed scripts
- **Volume:** Minimal for basic testing
- **Privacy:** No restrictions (no real data)
- **Backup:** Not required

### Staging
- **Source:** Anonymized production data or realistic test data
- **Volume:** Representative subset of production
- **Privacy:** All PII anonymized/fake
- **Backup:** Automated daily backups

### Production
- **Source:** Real customer data
- **Volume:** Full production dataset
- **Privacy:** Full PII protection, encrypted
- **Backup:** Multiple daily backups, point-in-time recovery

## Testing Strategy

### Development Testing
- Unit tests
- Integration tests
- Manual feature testing
- API testing

### Staging Testing
- End-to-end testing
- Performance testing
- Security testing
- User acceptance testing
- Integration testing with external services

### Production Testing
- Smoke tests post-deployment
- Health monitoring
- Performance monitoring
- User behavior analytics

## Security Levels

### Development
- ✅ Basic authentication
- ❌ HTTPS not required
- ❌ Production secrets
- ✅ Debug endpoints enabled

### Staging
- ✅ Full authentication
- ⚠️ HTTPS recommended
- ⚠️ Test credentials only
- ⚠️ Limited debug endpoints

### Production
- ✅ Full authentication + authorization
- ✅ HTTPS required
- ✅ Production secrets
- ❌ Debug endpoints disabled
- ✅ Rate limiting
- ✅ Security headers
- ✅ Audit logging

## Monitoring & Observability

### Development
- Console logging
- Basic error handling
- Local debugging tools

### Staging
- Structured logging (INFO level)
- Error tracking (Sentry staging)
- Performance monitoring
- Health checks
- Basic metrics collection

### Production
- Structured logging (WARNING+ level)
- Error tracking (Sentry production)
- Full performance monitoring
- Comprehensive health checks
- Business metrics
- Alerting system
- SLA monitoring

## Quick Commands Reference

### Development
```bash
# Start services
npm run dev
docker-compose up -d

# Run tests
npm test
pytest

# View logs
docker-compose logs -f
```

### Staging
```bash
# Deploy
./scripts/deploy-staging.sh

# Health check
./scripts/staging-health-check.sh

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Connect to database
docker-compose -f docker-compose.staging.yml exec postgres-staging psql -U staging_user 6fb_booking_staging
```

### Production
```bash
# Deploy (requires approval)
./scripts/deploy-production.sh

# Health check
./scripts/production-health-check.sh

# View logs (requires elevated access)
kubectl logs -f deployment/6fb-backend

# Emergency procedures
./scripts/emergency-rollback.sh
```

## Environment Promotion Flow

```
Development → Staging → Production
    ↓           ↓          ↓
  Feature    Integration  Release
  Testing      Testing    Deployment
```

### Promotion Checklist

**Development → Staging:**
- [ ] All tests pass
- [ ] Code review completed
- [ ] Feature complete
- [ ] No debug code in commits

**Staging → Production:**
- [ ] Staging tests pass
- [ ] Performance acceptable
- [ ] Security review completed
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Stakeholder approval

## Common Issues & Solutions

### Development Issues
- **Port conflicts:** Change ports in docker-compose.yml
- **Database locked:** Restart SQLite, check file permissions
- **Module not found:** Run `npm install` or `pip install -r requirements.txt`

### Staging Issues
- **Services won't start:** Check logs, verify environment variables
- **Database connection:** Check PostgreSQL container health
- **Performance slow:** Check resource limits, optimize queries

### Production Issues
- **High response times:** Check monitoring, scale services
- **Database errors:** Check connection pool, run diagnostics
- **Memory issues:** Check resource usage, restart services

## Support & Documentation

- **Development:** Local documentation, code comments
- **Staging:** This guide, health check scripts, debug logs
- **Production:** Operations runbook, monitoring dashboards, on-call procedures

---

For detailed setup instructions for each environment, see:
- [Development Setup](./README.md)
- [Staging Environment](./STAGING_ENVIRONMENT.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
