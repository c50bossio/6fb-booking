# BookedBarber V2 - Production Deployment Runbook
**Complete operational guide for production deployment and maintenance**

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Process](#deployment-process)
- [Post-Deployment Verification](#post-deployment-verification)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Emergency Procedures](#emergency-procedures)
- [Maintenance Tasks](#maintenance-tasks)
- [Performance Optimization](#performance-optimization)
- [Security Procedures](#security-procedures)
- [Contact Information](#contact-information)

---

## Pre-Deployment Checklist

### 🔐 Security Verification
- [ ] **API Keys Validation**
  ```bash
  # Run environment key validation
  python scripts/validate-environment-keys.py --environment production
  ```
  - [ ] All production API keys are live keys (not test keys)
  - [ ] Stripe keys: `sk_live_*` and `pk_live_*`
  - [ ] SendGrid API key is production-ready
  - [ ] Google OAuth credentials are for production app
  - [ ] Environment variables match `.env.production.template`

- [ ] **Security Configuration**
  - [ ] SSL certificates are valid and up-to-date
  - [ ] HTTPS redirect is enabled
  - [ ] Security headers are configured
  - [ ] Rate limiting is enabled with production thresholds
  - [ ] CORS origins are restricted to production domains

### 📊 Infrastructure Readiness
- [ ] **Database Preparation**
  ```bash
  # Create database backup before deployment
  pg_dump $DATABASE_URL > backup_pre_deployment_$(date +%Y%m%d_%H%M%S).sql
  
  # Run database optimization
  python scripts/optimize-database-performance.py
  ```
  - [ ] Database migrations are ready and tested
  - [ ] Performance indexes are created
  - [ ] Connection pooling is configured
  - [ ] Read replicas are set up (if applicable)

- [ ] **Render Configuration**
  - [ ] Production Render configuration is optimized
  - [ ] Auto-scaling settings are appropriate
  - [ ] Health checks are configured
  - [ ] Environment variables are set in Render dashboard

- [ ] **Monitoring Setup**
  ```bash
  # Set up production monitoring
  ./scripts/setup-production-monitoring.sh
  ```
  - [ ] Sentry error tracking is configured
  - [ ] Uptime monitoring is active
  - [ ] Performance metrics collection is enabled
  - [ ] Alert channels are configured (Slack, email)

### 🧪 Testing and Validation
- [ ] **Staging Environment Testing**
  - [ ] All features tested in staging environment
  - [ ] Payment processing tested with test keys
  - [ ] API endpoints responding correctly
  - [ ] Frontend builds successfully
  - [ ] No console errors in browser

- [ ] **Load Testing**
  ```bash
  # Run load testing (if applicable)
  ./scripts/run-load-tests.sh
  ```
  - [ ] API can handle expected traffic load
  - [ ] Database performance is acceptable
  - [ ] Response times are within SLA

---

## Deployment Process

### 🚀 Standard Deployment (GitHub PR Method)

#### Step 1: Feature Branch to Staging
```bash
# 1. Create pull request to staging
git checkout staging
git pull origin staging
gh pr create --base staging --title "Deploy: Feature Name" \
  --body "## Summary
- Feature implementation details
- Testing completed in development

## Pre-Deployment Checklist
- [x] Tests passing
- [x] Code review completed
- [x] Database migrations ready

## Post-Deployment Tasks
- [ ] Verify feature functionality
- [ ] Monitor error rates
- [ ] Check performance metrics

🤖 Generated with Claude Code"

# 2. Merge to staging after approval
gh pr merge --squash
```

#### Step 2: Staging to Production
```bash
# 1. Verify staging deployment is successful
curl -f https://api-staging.bookedbarbe.com/health
curl -f https://staging.bookedbarber.com

# 2. Create production deployment PR
git checkout staging
git pull origin staging
gh pr create --base production --title "Release: Production Deployment $(date +%Y-%m-%d)" \
  --body "## Production Release Summary
✅ Staging testing complete
✅ All systems verified
✅ Database backup completed

## Changes in this Release
- List of features/fixes being deployed

## Post-Deployment Verification
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Payment processing functional
- [ ] No critical errors in logs

## Rollback Plan
- Rollback commit ready: $(git rev-parse HEAD~1)
- Database backup: $(date +%Y%m%d_%H%M%S)

🤖 Generated with Claude Code"

# 3. Merge to production after final approval
gh pr merge --squash
```

### 🔄 Auto-Deployment Process (Render)
Once merged to production branch:
1. **Render Auto-Deploy**: Automatically triggered by GitHub push
2. **Build Process**: 
   - Backend: `pip install` → `migration` → `start`
   - Frontend: `npm install` → `npm run build` → `npm start`
3. **Health Check**: Render performs health checks before routing traffic
4. **DNS Update**: Traffic automatically routed to new deployment

---

## Post-Deployment Verification

### ✅ Immediate Verification (First 15 minutes)

```bash
# 1. Run comprehensive health check
./scripts/health-check.sh

# 2. Verify API endpoints
curl -f https://api.bookedbarber.com/health
curl -f https://api.bookedbarber.com/api/v2/health
curl -f https://bookedbarber.com

# 3. Test critical user flows
./scripts/test-critical-flows.sh

# 4. Check error rates
curl -s "https://api.bookedbarber.com/api/v2/monitoring/errors" | jq '.error_rate'
```

**Verification Checklist:**
- [ ] All health endpoints returning 200
- [ ] Frontend loads without errors
- [ ] Database connections working
- [ ] Payment system operational
- [ ] Authentication working
- [ ] No spike in error rates
- [ ] Response times within normal range

### 📊 Extended Monitoring (First Hour)

```bash
# Monitor key metrics
watch -n 30 'curl -s https://api.bookedbarber.com/api/v2/monitoring/metrics'

# Check application logs
tail -f /var/log/bookedbarber-*.log

# Monitor database performance
python scripts/monitor-database.py --duration 3600
```

**Monitoring Checklist:**
- [ ] Error rate < 1%
- [ ] Response time p95 < 2 seconds
- [ ] Database connections stable
- [ ] Memory usage normal
- [ ] No unusual log patterns
- [ ] Payment success rate > 95%

---

## Monitoring and Alerting

### 📈 Key Metrics Dashboard

**Business Metrics** (Six Figure Barber KPIs):
- Daily bookings count
- Revenue per day
- Client retention rate
- Payment success rate
- Average booking value

**Technical Metrics**:
- API response time (p95)
- Error rate percentage
- Database connection count
- Cache hit ratio
- Active user sessions

**Infrastructure Metrics**:
- CPU utilization
- Memory usage
- Database performance
- Network latency
- Storage usage

### 🚨 Alert Thresholds

**Critical Alerts** (Immediate Response):
- API error rate > 5%
- Database connections > 180
- Payment failure rate > 10%
- Site down (health check fails)
- Security incidents

**Warning Alerts** (Monitor Closely):
- API response time > 2 seconds
- Error rate > 1%
- Database cache hit ratio < 95%
- Memory usage > 80%
- Daily revenue 20% below average

**Info Alerts** (Track Trends):
- Database size growth
- New user signups
- Feature usage patterns
- Performance trends

### 📱 Alert Channels
- **Slack**: `#production-alerts` for all alerts
- **Email**: `alerts@bookedbarber.com` for critical
- **PagerDuty**: For after-hours critical alerts
- **SMS**: For payment system failures

---

## Troubleshooting Guide

### 🚨 Common Issues and Solutions

#### Issue: High API Response Times
**Symptoms**: Response times > 3 seconds, user complaints about slow loading

**Investigation Steps**:
```bash
# 1. Check database performance
python scripts/monitor-database.py --check-slow-queries

# 2. Analyze API performance
curl -w "@curl-format.txt" -s -o /dev/null https://api.bookedbarber.com/api/v2/appointments

# 3. Check database connections
./scripts/check-db-connections.sh

# 4. Review server resources
htop
df -h
```

**Solutions**:
- Optimize slow database queries
- Increase database connection pool
- Scale up Render instance
- Enable caching for frequently requested data

#### Issue: Payment Processing Failures
**Symptoms**: Stripe webhook failures, payment status not updating

**Investigation Steps**:
```bash
# 1. Check Stripe webhook logs
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/webhook_endpoints

# 2. Review payment processing logs
grep "payment" /var/log/bookedbarber-backend.log | tail -50

# 3. Test webhook endpoint
curl -X POST https://api.bookedbarber.com/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Solutions**:
- Verify Stripe webhook URL configuration
- Check webhook signature validation
- Ensure payment processing is idempotent
- Review database transaction handling

#### Issue: Frontend Not Loading
**Symptoms**: White screen, JavaScript errors, build failures

**Investigation Steps**:
```bash
# 1. Check build logs in Render dashboard
# 2. Test API connectivity from frontend
curl -f https://api.bookedbarber.com/health

# 3. Check browser console for errors
# 4. Verify environment variables are set
```

**Solutions**:
- Rebuild frontend with latest changes
- Verify API_URL environment variable
- Check CORS configuration
- Clear CDN cache if applicable

#### Issue: Database Connection Exhaustion
**Symptoms**: "too many connections" errors, slow queries

**Investigation Steps**:
```bash
# 1. Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Identify connection sources
psql $DATABASE_URL -c "SELECT client_addr, count(*) FROM pg_stat_activity GROUP BY client_addr;"

# 3. Check connection pool status
./scripts/check-pgbouncer-status.sh
```

**Solutions**:
- Increase max_connections in PostgreSQL
- Optimize connection pooling settings
- Fix connection leaks in application code
- Scale database instance

---

## Emergency Procedures

### 🚨 Emergency Rollback Process

**When to Rollback**:
- Critical functionality broken
- Error rate > 10%
- Security vulnerability discovered
- Payment processing completely failing
- Database corruption or data loss

**Rollback Steps**:
```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Create emergency rollback branch
git checkout production
git checkout -b emergency-rollback-$(date +%Y%m%d-%H%M%S)
git reset --hard <last_good_commit>

# 3. Force push to trigger emergency deployment
git push origin emergency-rollback-$(date +%Y%m%d-%H%M%S) --force

# 4. Update production branch to rollback commit
git checkout production
git reset --hard <last_good_commit>
git push origin production --force-with-lease

# 5. Verify rollback successful
./scripts/health-check.sh
```

**Post-Rollback Actions**:
- [ ] Verify all systems operational
- [ ] Notify stakeholders of rollback
- [ ] Create incident report
- [ ] Plan fix for rolled-back changes
- [ ] Schedule re-deployment after fix

### 🔥 Emergency Hotfix Process

**For Critical Security Issues or Data Loss**:
```bash
# 1. Create hotfix branch from production
git checkout production
git pull origin production
git checkout -b hotfix/critical-issue-$(date +%Y%m%d)

# 2. Implement minimal fix
# ... make necessary changes ...

# 3. Test fix locally
./scripts/run-tests.sh

# 4. Deploy directly to production (skip staging for critical issues)
git add .
git commit -m "hotfix: critical security/data issue fix"
git push origin hotfix/critical-issue-$(date +%Y%m%d)

# 5. Create PR and merge immediately
gh pr create --base production --title "HOTFIX: Critical Issue" \
  --body "Emergency hotfix for critical production issue"
gh pr merge --squash

# 6. Backport to staging
git checkout staging
git cherry-pick <hotfix_commit>
git push origin staging
```

### 📞 Incident Response Team

**Primary Contacts**:
- **Technical Lead**: technical-lead@bookedbarber.com
- **DevOps Engineer**: devops@bookedbarber.com  
- **Product Manager**: product@bookedbarber.com
- **CEO/Founder**: ceo@bookedbarber.com

**Escalation Process**:
1. **5 minutes**: Technical team notified
2. **15 minutes**: Management team notified
3. **30 minutes**: Executive team notified
4. **1 hour**: External communication if customer-facing

---

## Maintenance Tasks

### 📅 Daily Tasks (Automated)
```bash
# Automated via cron jobs
0 2 * * * /usr/bin/python3 /scripts/daily-maintenance.py
0 6 * * * /bin/bash /scripts/daily-monitoring-summary.sh
```

**Tasks Include**:
- Database health check and optimization
- Log rotation and cleanup
- Security scan and alert review
- Performance metrics collection
- Backup verification

### 📅 Weekly Tasks (Manual)
```bash
# Run weekly maintenance script
./scripts/weekly-maintenance.sh
```

**Checklist**:
- [ ] Review error logs and trends
- [ ] Check database performance metrics
- [ ] Update dependencies and security patches
- [ ] Review monitoring alerts and false positives
- [ ] Verify backup and recovery procedures
- [ ] Check SSL certificate expiration dates
- [ ] Review API rate limiting effectiveness

### 📅 Monthly Tasks
```bash
# Generate monthly performance report
python scripts/generate-monthly-report.py
```

**Checklist**:
- [ ] Comprehensive performance review
- [ ] Security audit and penetration testing
- [ ] Database optimization and index review
- [ ] Cost analysis and optimization
- [ ] Disaster recovery testing
- [ ] Documentation updates
- [ ] Team training and knowledge sharing

### 📅 Quarterly Tasks
**Checklist**:
- [ ] Full system architecture review
- [ ] Capacity planning and scaling assessment
- [ ] Security compliance audit
- [ ] Third-party service review and negotiations
- [ ] Business continuity plan testing
- [ ] Technology stack evaluation and updates

---

## Performance Optimization

### 🚀 Database Optimization
```bash
# Run comprehensive database optimization
python scripts/optimize-database-performance.py

# Monitor database performance
python scripts/monitor-database.py --generate-report
```

**Optimization Areas**:
- Index optimization for query patterns
- Connection pooling configuration
- Query performance tuning
- Auto-vacuum settings
- Memory allocation tuning

### ⚡ API Performance Optimization
```bash
# Profile API performance
python scripts/profile-api-performance.py

# Test critical endpoints
./scripts/test-api-performance.sh
```

**Optimization Areas**:
- Response caching implementation
- Database query optimization
- Async processing for heavy operations
- API rate limiting fine-tuning
- Resource allocation optimization

### 🎯 Frontend Performance Optimization
```bash
# Analyze frontend performance
npm run analyze-bundle
lighthouse https://bookedbarber.com --output=json --quiet
```

**Optimization Areas**:
- Bundle size optimization
- Image compression and lazy loading
- CDN implementation for static assets
- Browser caching strategies
- Core Web Vitals improvement

---

## Security Procedures

### 🔐 Security Monitoring
```bash
# Run security audit
python scripts/security-audit.py

# Check for vulnerabilities
npm audit
safety check
```

**Regular Security Tasks**:
- [ ] Monitor failed authentication attempts
- [ ] Review access logs for anomalies
- [ ] Check for outdated dependencies
- [ ] Verify SSL certificate status
- [ ] Review API rate limiting logs
- [ ] Monitor for suspicious payment activity

### 🛡️ Incident Response
**Security Incident Categories**:
- **P0 Critical**: Data breach, payment system compromise
- **P1 High**: Unauthorized access, malware detection
- **P2 Medium**: Suspicious activity, policy violations

**Response Steps**:
1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Alert appropriate stakeholders
4. **Remediate**: Fix vulnerabilities and restore security
5. **Document**: Create incident report and lessons learned

### 🔒 Access Management
**Access Review Process**:
- Monthly review of user permissions
- Quarterly audit of API key usage
- Annual review of third-party integrations
- Immediate revocation for departing team members

---

## Contact Information

### 📞 Emergency Contacts
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Technical Lead**: technical-lead@bookedbarber.com
- **DevOps Team**: devops@bookedbarber.com

### 🏢 Business Contacts
- **Product Team**: product@bookedbarber.com
- **Customer Support**: support@bookedbarber.com
- **Executive Team**: exec@bookedbarber.com

### 🔧 Service Contacts
- **Render Support**: support@render.com
- **Stripe Support**: support@stripe.com
- **SendGrid Support**: support@sendgrid.com

### 📚 Documentation Links
- **API Documentation**: https://api.bookedbarber.com/docs
- **Render Dashboard**: https://dashboard.render.com
- **Monitoring Dashboard**: https://monitoring.bookedbarber.com
- **GitHub Repository**: https://github.com/bookedbarber/bookedbarber-v2

---

## Appendix

### 📋 Quick Reference Commands
```bash
# Health check
./scripts/health-check.sh

# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# View recent errors
tail -f /var/log/bookedbarber-*.log | grep ERROR

# Check API status
curl -f https://api.bookedbarber.com/health

# Monitor real-time metrics
watch -n 5 'curl -s https://api.bookedbarber.com/api/v2/monitoring/metrics'

# Emergency rollback
git checkout production && git reset --hard <commit> && git push --force-with-lease
```

### 🔗 Important URLs
- **Production Frontend**: https://bookedbarber.com
- **Production API**: https://api.bookedbarber.com
- **Staging Frontend**: https://staging.bookedbarber.com
- **Staging API**: https://api-staging.bookedbarber.com
- **Monitoring Dashboard**: [To be configured]
- **Error Tracking**: [Sentry Dashboard URL]

---

*Last Updated: 2025-07-23*
*Version: 1.0*
*Owner: BookedBarber DevOps Team*