# Deployment Monitoring Checklist for 6FB Booking Platform

## Pre-Deployment Verification

### 1. Environment Configuration
- [ ] Verify all environment variables are set in Render dashboard
- [ ] Confirm `DATABASE_URL` points to production PostgreSQL
- [ ] Check `SECRET_KEY` is unique and secure
- [ ] Verify external service credentials (Stripe, SendGrid, Twilio)
- [ ] Confirm `BACKEND_URL` and `FRONTEND_URL` are correct

### 2. Database Setup
- [ ] Database migrations applied successfully
- [ ] Initial data seeded (if applicable)
- [ ] Admin user created and tested
- [ ] Database backup created before deployment

### 3. Build Process
- [ ] Backend build completed without errors
- [ ] All dependencies installed correctly
- [ ] Frontend build successful
- [ ] Static assets generated properly

## Deployment Monitoring Steps

### 1. Initial Deployment (0-5 minutes)

#### A. Run Automated Monitoring Script
```bash
# Start monitoring with 30-second intervals for first 5 minutes
python scripts/monitor-deployment.py --quick

# Or for continuous monitoring
python scripts/monitor-deployment.py --duration 30
```

#### B. Manual Verification
- [ ] Access health endpoint: https://sixfb-backend.onrender.com/health
  - Verify status: "healthy"
  - Check database connection status
  - Note response time (should be < 500ms)

- [ ] Access API documentation: https://sixfb-backend.onrender.com/docs
  - Verify Swagger UI loads properly
  - Check all endpoints are listed
  - Test authentication endpoint

- [ ] Check Render deployment logs:
  1. Go to Render Dashboard
  2. Select your service
  3. Click "Logs" tab
  4. Look for:
     - "Application startup complete"
     - "Uvicorn running on http://0.0.0.0:10000"
     - No error messages or exceptions

### 2. Functional Testing (5-15 minutes)

#### A. API Endpoints
- [ ] Test public endpoints:
  ```bash
  curl https://sixfb-backend.onrender.com/api/v1/services
  curl https://sixfb-backend.onrender.com/api/v1/barbers
  ```

- [ ] Test authentication:
  ```bash
  # Login request
  curl -X POST https://sixfb-backend.onrender.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "your-email@example.com", "password": "your-password"}'  # pragma: allowlist secret
  ```

- [ ] Test protected endpoints with token:
  ```bash
  # Use token from login response
  curl https://sixfb-backend.onrender.com/api/v1/users/me \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

#### B. Database Connectivity
- [ ] Create test appointment through API
- [ ] Retrieve created appointment
- [ ] Update appointment status
- [ ] Delete test appointment

#### C. External Integrations
- [ ] Test Stripe webhook endpoint (if configured)
- [ ] Verify SendGrid email capability
- [ ] Check Google Calendar sync (if enabled)

### 3. Performance Monitoring (15-30 minutes)

#### A. Response Time Analysis
- [ ] Monitor average response times (target < 200ms)
- [ ] Check for any timeouts or slow endpoints
- [ ] Verify no memory leaks in logs

#### B. Load Testing (Optional)
```bash
# Simple load test with curl
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
    https://sixfb-backend.onrender.com/health
done
```

#### C. Resource Usage
- [ ] Check Render metrics dashboard:
  - CPU usage (should be < 50% idle)
  - Memory usage (should be stable)
  - Response time graphs
  - Error rate (should be 0%)

### 4. Security Verification

- [ ] HTTPS working correctly
- [ ] CORS headers properly configured
- [ ] Security headers present (check with curl -I)
- [ ] API rate limiting active
- [ ] No sensitive data in logs

## Continuous Monitoring Setup

### 1. Automated Monitoring
```bash
# Run continuous monitoring in background
nohup python scripts/monitor-deployment.py > monitor.log 2>&1 &

# Check monitoring logs
tail -f scripts/logs/deployment_monitor_*.log
```

### 2. Render Native Monitoring
1. **Enable Health Checks**:
   - Path: `/health`
   - Expected status: 200
   - Timeout: 30 seconds
   - Interval: 300 seconds

2. **Set Up Alerts**:
   - Email notifications for failures
   - Webhook to Slack/Discord
   - PagerDuty integration (if available)

3. **Configure Auto-Scaling** (if on paid plan):
   - Min instances: 1
   - Max instances: 3
   - Target CPU: 70%
   - Target Memory: 80%

### 3. External Monitoring Services

#### A. UptimeRobot (Free Tier)
- [ ] Create monitor for: https://sixfb-backend.onrender.com/health
- [ ] Set check interval: 5 minutes
- [ ] Configure email alerts
- [ ] Add status page

#### B. Pingdom (Optional)
- [ ] Set up transaction monitoring
- [ ] Configure multi-location checks
- [ ] Set up SMS alerts for critical issues

## Troubleshooting Guide

### Common Issues and Solutions

1. **503 Service Unavailable**
   - Check Render deployment status
   - Verify build completed successfully
   - Check for port binding issues
   - Review recent code changes

2. **Database Connection Errors**
   - Verify DATABASE_URL is correct
   - Check PostgreSQL addon status in Render
   - Test connection with psql client
   - Review connection pool settings

3. **Slow Response Times**
   - Check for N+1 query problems
   - Review database indexes
   - Check external API latencies
   - Monitor memory usage

4. **Authentication Failures**
   - Verify SECRET_KEY is set
   - Check JWT token expiration
   - Review CORS configuration
   - Test with fresh tokens

### Viewing Render Logs

1. **Via Render Dashboard**:
   ```
   Dashboard > Service > Logs > Filter by:
   - Error logs only
   - Last hour
   - Search for specific errors
   ```

2. **Via Render CLI**:
   ```bash
   # Install Render CLI
   brew install render/render/render

   # Login
   render login

   # Stream logs
   render logs -s your-service-name --tail
   ```

3. **Log Analysis Commands**:
   ```bash
   # Count errors in last hour
   render logs -s your-service-name --since 1h | grep ERROR | wc -l

   # Find slow requests
   render logs -s your-service-name | grep "response_time" | awk '$NF > 1000'

   # Monitor specific endpoint
   render logs -s your-service-name | grep "/api/v1/appointments"
   ```

## Post-Deployment Actions

### 1. Documentation
- [ ] Update deployment date in README
- [ ] Document any configuration changes
- [ ] Note performance baselines
- [ ] Create rollback plan

### 2. Stakeholder Communication
- [ ] Notify team of successful deployment
- [ ] Share monitoring dashboard access
- [ ] Provide health check URL
- [ ] Schedule post-deployment review

### 3. Backup and Recovery
- [ ] Create post-deployment database backup
- [ ] Test restore procedure
- [ ] Document rollback steps
- [ ] Save deployment artifacts

## Emergency Procedures

### Rollback Process
1. **Via Render Dashboard**:
   - Go to Service > Deploys
   - Find last working deployment
   - Click "Rollback to this deploy"

2. **Via Git**:
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push origin main

   # Or reset to specific commit
   git reset --hard <commit-hash>
   git push --force origin main
   ```

### Emergency Contacts
- Render Support: support@render.com
- On-call Engineer: [Your contact]
- Database Admin: [DBA contact]
- DevOps Lead: [DevOps contact]

## Monitoring Script Usage

### Basic Usage
```bash
# Quick 5-minute check
python scripts/monitor-deployment.py --quick

# Monitor for 1 hour
python scripts/monitor-deployment.py --duration 60

# Continuous monitoring (until stopped)
python scripts/monitor-deployment.py
```

### Output Files
- Logs: `scripts/logs/deployment_monitor_*.log`
- Alerts: `scripts/logs/alert_*.txt`
- Summary: `scripts/logs/deployment_summary_*.json`

### Alert Configuration
The monitoring script will alert when:
- Any endpoint fails 3 consecutive times
- Database connectivity is lost
- Average response time exceeds 1 second
- Any critical error occurs

## Success Criteria

Deployment is considered successful when:
- [ ] All health checks passing for 30 minutes
- [ ] Zero error rate in logs
- [ ] Response times < 500ms average
- [ ] All critical endpoints accessible
- [ ] Database queries executing normally
- [ ] No memory leaks detected
- [ ] External integrations functional

## Regular Monitoring Schedule

- **Every 5 minutes**: Automated health check
- **Every hour**: Review error logs
- **Daily**: Check performance metrics
- **Weekly**: Review monitoring alerts
- **Monthly**: Performance trend analysis
