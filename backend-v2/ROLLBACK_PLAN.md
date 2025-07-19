# Emergency Rollback Plan

This document provides step-by-step procedures for rolling back changes if issues arise during or after the parallel refactoring efforts (credential rotation, code consolidation, and test creation).

## 🚨 Emergency Contacts

- **Primary Developer**: [Your contact info]
- **DevOps Lead**: [Contact info]
- **Database Admin**: [Contact info]
- **Emergency Escalation**: [Contact info]

## 📋 Pre-Rollback Checklist

Before initiating any rollback:

1. **Assess the Situation**
   - [ ] Document the specific issue(s)
   - [ ] Determine if this is a partial or complete rollback
   - [ ] Check if the issue affects production users
   - [ ] Verify if data integrity is at risk

2. **Communication**
   - [ ] Notify the team via [communication channel]
   - [ ] Create incident ticket: [ticket system]
   - [ ] Update status page if user-facing

3. **Backup Current State**
   ```bash
   # Create emergency backup
   git tag emergency-backup-$(date +%Y%m%d-%H%M%S)
   git push origin --tags
   ```

## 🔄 Rollback Procedures

### 1. Code Rollback (Git-based)

#### Option A: Revert Specific Commits
```bash
# Identify problematic commits
git log --oneline -20

# Revert specific commits (safest approach)
git revert <commit-hash> --no-edit

# Push the revert
git push origin main
```

#### Option B: Reset to Previous Known Good State
```bash
# ⚠️ DESTRUCTIVE - Use only in emergencies
# Find last known good commit
git log --oneline

# Create backup branch first
git checkout -b emergency-backup-$(date +%Y%m%d)
git push origin emergency-backup-$(date +%Y%m%d)

# Reset to known good state
git checkout main
git reset --hard <known-good-commit-hash>
git push --force-with-lease origin main
```

### 2. Database Rollback

#### Alembic Migration Rollback
```bash
# Check current migration
alembic current

# Show migration history
alembic history

# Rollback to previous migration
alembic downgrade -1

# Or rollback to specific revision
alembic downgrade <revision-id>

# For multiple rollbacks
alembic downgrade -2  # Go back 2 migrations
```

#### Database Backup Restoration
```bash
# For SQLite (development)
cp backup_db_$(date +%Y%m%d).db app.db

# For PostgreSQL (production)
# 1. Stop application first
docker-compose stop backend-v2

# 2. Restore from backup
pg_restore -d bookedbarber_db backup_$(date +%Y%m%d).sql

# 3. Restart application
docker-compose up -d backend-v2
```

### 3. Service-Specific Rollbacks

#### Backend Service Rollback
```bash
# Stop current backend
docker-compose stop backend-v2

# Pull previous image version
docker pull ghcr.io/your-org/backend-v2:previous-tag

# Update docker-compose.yml
sed -i 's/:latest/:previous-tag/' docker-compose.yml

# Restart with previous version
docker-compose up -d backend-v2
```

#### Frontend Service Rollback
```bash
# For Next.js deployment
cd backend-v2/frontend-v2

# Checkout previous working version
git checkout <previous-commit>

# Rebuild and deploy
npm run build
npm start

# Or use Docker
docker-compose stop frontend-v2
docker pull ghcr.io/your-org/frontend-v2:previous-tag
docker-compose up -d frontend-v2
```

### 4. Configuration Rollback

#### Environment Variables
```bash
# Restore from backup
cp .env.backup .env

# Or restore specific variables
export STRIPE_SECRET_KEY="previous-value"
export DATABASE_URL="previous-value"

# Restart affected services
docker-compose restart backend-v2
```

#### Integration Settings
```bash
# Restore integration configurations
cd backend-v2
python -c "
from services.integration_service import IntegrationService
# Restore previous integration settings
IntegrationService.restore_backup('backup_$(date +%Y%m%d)')
"
```

## 🔍 Service-by-Service Rollback Instructions

### Authentication Service
```bash
# 1. Rollback auth-related migrations
alembic downgrade -1  # If auth tables were modified

# 2. Restore JWT secrets
export JWT_SECRET_KEY="previous-secret"

# 3. Clear auth caches
redis-cli FLUSHDB  # If using Redis

# 4. Restart auth service
docker-compose restart backend-v2
```

### Payment Service
```bash
# 1. Rollback to previous Stripe configuration
export STRIPE_SECRET_KEY="previous-key"
export STRIPE_WEBHOOK_SECRET="previous-webhook-secret"

# 2. Disable new payment features
export ENABLE_NEW_PAYMENT_FLOW="false"

# 3. Restore payment-related database changes
alembic downgrade <payment-migration-id>

# 4. Restart payment processing
docker-compose restart backend-v2
```

### Booking Service
```bash
# 1. Rollback booking logic changes
git checkout HEAD~1 -- services/booking_service.py

# 2. Restore booking-related database schema
alembic downgrade <booking-migration-id>

# 3. Clear booking caches
python -c "
from services.booking_cache_service import BookingCacheService
BookingCacheService.clear_all_caches()
"

# 4. Restart booking service
docker-compose restart backend-v2
```

### Notification Service
```bash
# 1. Restore notification configurations
export SENDGRID_API_KEY="previous-key"
export TWILIO_AUTH_TOKEN="previous-token"

# 2. Disable new notification features
export ENABLE_ADVANCED_NOTIFICATIONS="false"

# 3. Restart notification workers
docker-compose restart notification-worker
```

### Integration Service
```bash
# 1. Rollback integration configurations
python scripts/restore_integration_backup.py --date $(date +%Y%m%d)

# 2. Disable new integrations
export ENABLE_GMB_INTEGRATION="false"
export ENABLE_ADVANCED_ANALYTICS="false"

# 3. Restart integration services
docker-compose restart backend-v2
```

## 🗄️ Database Rollback Procedures

### 1. Check Database State
```bash
# Connect to database
psql $DATABASE_URL  # PostgreSQL
# or
sqlite3 app.db     # SQLite

# Check for data corruption
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM appointments;
SELECT COUNT(*) FROM payments;
```

### 2. Staged Database Rollback
```bash
# Step 1: Backup current state
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M).sql

# Step 2: Rollback migrations one by one
alembic downgrade -1
# Test application after each rollback
curl http://localhost:8000/health

# Step 3: If issues persist, continue rollback
alembic downgrade -1
# Test again

# Step 4: Restore from known good backup if needed
dropdb bookedbarber_db
createdb bookedbarber_db
pg_restore -d bookedbarber_db backup_known_good.sql
```

### 3. Data Migration Rollback
```bash
# If data was migrated during the update
# 1. Stop data processing
docker-compose stop celery-worker

# 2. Rollback data changes
python scripts/rollback_data_migration.py --migration-id <id>

# 3. Verify data integrity
python scripts/verify_data_integrity.py

# 4. Restart services
docker-compose up -d
```

## 🚀 Emergency Recovery Procedures

### Complete System Rollback
```bash
#!/bin/bash
# emergency_rollback.sh

echo "🚨 EMERGENCY SYSTEM ROLLBACK INITIATED"
echo "Timestamp: $(date)"

# 1. Create emergency backup
git tag emergency-$(date +%Y%m%d-%H%M%S)
git push origin --tags

# 2. Stop all services
docker-compose down

# 3. Rollback to last known good state
LAST_GOOD_COMMIT="main~10"  # Adjust as needed
git reset --hard $LAST_GOOD_COMMIT

# 4. Rollback database
alembic downgrade base
alembic upgrade head

# 5. Restore environment variables
cp .env.backup .env

# 6. Restart services
docker-compose up -d

# 7. Health check
sleep 30
curl -f http://localhost:8000/health || echo "❌ Backend health check failed"
curl -f http://localhost:3000 || echo "❌ Frontend health check failed"

echo "✅ Emergency rollback completed"
```

### Partial Service Rollback
```bash
#!/bin/bash
# partial_rollback.sh

SERVICE=$1
if [ -z "$SERVICE" ]; then
    echo "Usage: ./partial_rollback.sh <service_name>"
    exit 1
fi

echo "🔄 Rolling back $SERVICE"

case $SERVICE in
    "auth")
        git checkout HEAD~1 -- routers/auth.py
        git checkout HEAD~1 -- services/auth_service.py
        ;;
    "payments")
        git checkout HEAD~1 -- routers/payments.py
        git checkout HEAD~1 -- services/payment_service.py
        ;;
    "booking")
        git checkout HEAD~1 -- routers/appointments.py
        git checkout HEAD~1 -- services/booking_service.py
        ;;
    *)
        echo "❌ Unknown service: $SERVICE"
        exit 1
        ;;
esac

# Restart the specific service
docker-compose restart backend-v2

echo "✅ $SERVICE rollback completed"
```

## 🧪 Post-Rollback Validation

### 1. System Health Checks
```bash
# Run comprehensive health check
python scripts/health_check_all.py --fail-on-warn

# Check all endpoints
curl -f http://localhost:8000/health
curl -f http://localhost:8000/api/v2/health
curl -f http://localhost:3000

# Verify database connectivity
python -c "
from database import get_db
db = next(get_db())
print('Database connection: OK')
"
```

### 2. Integration Testing
```bash
# Test critical user flows
python scripts/test_critical_flows.py

# Test external integrations
python scripts/validate_integrations.py

# Test payment processing
python scripts/test_payment_flow.py --test-mode
```

### 3. Data Integrity Verification
```bash
# Check data consistency
python scripts/verify_data_integrity.py

# Check for orphaned records
python scripts/check_data_orphans.py

# Verify user accounts
python -c "
from models import User
from database import get_db
db = next(get_db())
count = db.query(User).count()
print(f'Total users: {count}')
"
```

## 📊 Monitoring After Rollback

### 1. Error Rate Monitoring
```bash
# Check error logs
tail -f logs/app.log | grep ERROR

# Monitor error rate
python scripts/monitor_error_rate.py --duration 60  # Monitor for 60 minutes
```

### 2. Performance Monitoring
```bash
# Check response times
python scripts/performance_monitor.py --endpoints /health,/api/v2/appointments

# Monitor database performance
python scripts/db_performance_monitor.py
```

### 3. User Impact Assessment
```bash
# Check active user sessions
python scripts/check_active_sessions.py

# Monitor appointment booking success rate
python scripts/monitor_booking_success.py
```

## 📝 Post-Incident Documentation

### 1. Incident Report Template
```markdown
# Incident Report

**Date**: $(date)
**Duration**: [Start time] - [End time]
**Severity**: [High/Medium/Low]

## Summary
Brief description of what happened.

## Timeline
- [Time]: Issue first detected
- [Time]: Rollback initiated
- [Time]: Services restored
- [Time]: Full recovery confirmed

## Root Cause
What caused the issue.

## Resolution
What was done to fix it.

## Prevention
What will be done to prevent this in the future.

## Lessons Learned
Key takeaways from this incident.
```

### 2. Update Rollback Procedures
After each incident, update this document with:
- New rollback steps discovered
- Timing improvements
- Additional monitoring requirements
- Communication improvements

## 🔧 Rollback Testing

### Monthly Rollback Drills
```bash
# 1. Create test environment
docker-compose -f docker-compose.test.yml up -d

# 2. Practice rollback procedures
./emergency_rollback.sh --test-mode

# 3. Document timing and issues
echo "Rollback drill completed in: $SECONDS seconds"

# 4. Update procedures based on findings
```

### Automated Rollback Testing
```bash
# Add to CI/CD pipeline
name: Rollback Testing
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
jobs:
  test-rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Test emergency rollback
        run: |
          # Simulate issues and test rollback
          ./test_rollback_procedures.sh
```

## 📞 Emergency Contact Procedures

### 1. Immediate Response Team
- **Lead Developer**: [Phone] [Email]
- **DevOps Engineer**: [Phone] [Email]
- **Product Manager**: [Phone] [Email]

### 2. Escalation Path
1. Team Lead (0-15 minutes)
2. Engineering Manager (15-30 minutes)
3. CTO (30-60 minutes)
4. CEO (60+ minutes for critical issues)

### 3. Communication Channels
- **Slack**: #incidents
- **Email**: engineering@company.com
- **Phone**: Emergency hotline
- **Status Page**: status.bookedbarber.com

---

## 📋 Rollback Verification Checklist

After any rollback, verify:

- [ ] All services are running
- [ ] Database is accessible and consistent
- [ ] API endpoints respond correctly
- [ ] Frontend loads and functions
- [ ] User authentication works
- [ ] Payment processing functions
- [ ] Integrations are connected
- [ ] Background jobs are processing
- [ ] Monitoring is active
- [ ] Logs are being written
- [ ] No data loss occurred
- [ ] Performance is acceptable
- [ ] Security measures are active

**Last Updated**: $(date)
**Version**: 1.0
**Review Date**: Monthly