# 📊 Sentry Production Monitoring Setup Guide

**Status**: No error tracking configured - production blind spot  
**Priority**: HIGH (production monitoring essential)  
**Time Required**: 30 minutes  
**Risk Level**: Low (monitoring enhancement)

---

## 🎯 Current Situation

⚠️ **Missing Production Monitoring**:
```bash
SENTRY_DSN=""  # Empty - no error tracking
SENTRY_ENVIRONMENT=development  # Wrong environment
```

✅ **Infrastructure Ready**:
- Sentry middleware already integrated in `main.py`
- Configuration system already supports Sentry
- Error handling already in place

---

## 🚀 Step-by-Step Setup Process

### Step 1: Create Sentry Account & Project (10 minutes)

1. **Sign Up for Sentry**
   ```bash
   URL: https://sentry.io/signup/
   Plan: Developer (free) or Team ($26/month recommended)
   ```

2. **Create New Project**
   ```bash
   Platform: Python (FastAPI)
   Project Name: BookedBarber-V2-Backend
   Team: Your organization
   ```

3. **Create Frontend Project** 
   ```bash
   Platform: Next.js
   Project Name: BookedBarber-V2-Frontend  
   Team: Same organization
   ```

### Step 2: Get DSN Keys (5 minutes)

1. **Backend DSN**
   ```bash
   # In Sentry > Settings > Projects > BookedBarber-V2-Backend > Client Keys (DSN)
   # Copy the DSN:
   BACKEND_DSN: https://abc123@o123456.ingest.sentry.io/123456
   ```

2. **Frontend DSN**
   ```bash
   # In Sentry > Settings > Projects > BookedBarber-V2-Frontend > Client Keys (DSN)
   # Copy the DSN:
   FRONTEND_DSN: https://def456@o123456.ingest.sentry.io/789012
   ```

### Step 3: Update Backend Configuration (5 minutes)

**Edit `backend-v2/.env`**:
```bash
# BEFORE:
SENTRY_DSN=""
SENTRY_ENVIRONMENT=development

# AFTER:
SENTRY_DSN=https://YOUR_BACKEND_DSN@o123456.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production

# Production optimized settings:
SENTRY_SAMPLE_RATE=0.8              # Sample 80% of errors in production
SENTRY_TRACES_SAMPLE_RATE=0.05      # Sample 5% of transactions for performance
SENTRY_PROFILES_SAMPLE_RATE=0.02    # Sample 2% of profiles
SENTRY_SEND_DEFAULT_PII=false       # Don't send PII for privacy
SENTRY_DEBUG=false                  # Disable debug in production
```

### Step 4: Update Frontend Configuration (5 minutes)

**Edit `backend-v2/frontend-v2/.env.local`**:
```bash
# Add these lines:
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_FRONTEND_DSN@o123456.ingest.sentry.io/789012
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### Step 5: Test Error Tracking (5 minutes)

**Test Backend Error Tracking**:
```bash
# 1. Restart backend
cd backend-v2
uvicorn main:app --reload

# 2. Trigger test error
curl -X POST http://localhost:8000/api/v2/test-error \
  -H "Content-Type: application/json"

# 3. Check Sentry dashboard
# Should see: New error in Sentry > Issues
```

**Test Frontend Error Tracking**:
```bash
# 1. Add test error to a page component
console.error("Test Sentry error tracking");
throw new Error("Test error for Sentry");

# 2. Visit page in browser
# 3. Check Sentry dashboard
# Should see: Frontend error in Sentry > Issues
```

---

## 📊 Configure Alerting & Teams

### Step 1: Set Up Team Notifications (5 minutes)

1. **Add Team Members**
   ```bash
   # In Sentry > Settings > Teams > Members
   # Invite: developers, devops, product team
   ```

2. **Configure Email Alerts**
   ```bash
   # In Sentry > Settings > Projects > BookedBarber-V2-Backend > Alerts
   # Create rule: "Send email when new issue is created"
   # Recipients: Development team
   ```

### Step 2: Create Slack Integration (Optional - 5 minutes)

1. **Install Sentry Slack App**
   ```bash
   # In Sentry > Settings > Integrations > Slack
   # Install and authorize
   ```

2. **Configure Slack Alerts**
   ```bash
   # Create alert rule:
   # When: New issue is created
   # Action: Send Slack notification to #alerts channel
   # Include: Error message, stack trace, user context
   ```

---

## 🚨 Production Alert Rules

### Critical Errors (Immediate Attention)
```bash
# Rule 1: Payment Processing Errors
Condition: Error tag contains "payment" OR "stripe"
Action: Email + Slack notification
Recipients: Development team + Product owner
Frequency: Immediately

# Rule 2: Database Connection Errors  
Condition: Error message contains "database" OR "connection"
Action: Email + SMS notification
Recipients: DevOps team
Frequency: Immediately

# Rule 3: Authentication Failures (Spike)
Condition: Error count > 10 in 5 minutes for "auth" errors
Action: Email notification
Recipients: Security team
Frequency: Once per hour
```

### Warning Alerts (Monitor Trends)
```bash
# Rule 4: High Error Rate
Condition: Error count > 50 in 15 minutes
Action: Email notification
Recipients: Development team
Frequency: Once per hour

# Rule 5: Performance Issues
Condition: Transaction duration > 5 seconds
Action: Email notification  
Recipients: Performance team
Frequency: Daily digest
```

---

## 📈 Performance Monitoring Setup

### Enable Performance Monitoring
```bash
# In backend-v2/.env (already configured):
SENTRY_TRACES_SAMPLE_RATE=0.05  # 5% sampling for production

# This enables:
- API endpoint performance tracking
- Database query monitoring  
- External service call timing
- User interaction tracking
```

### Key Performance Metrics
```bash
# Monitor these in Sentry > Performance:
1. API Response Times (target: <500ms)
2. Database Query Duration (target: <100ms) 
3. External API Calls (Stripe, SendGrid timing)
4. Frontend Page Load Times (target: <2s)
5. User Transaction Traces
```

---

## 🔒 Privacy & Security Configuration

### GDPR Compliance Settings
```bash
# In backend-v2/.env:
SENTRY_SEND_DEFAULT_PII=false          # Don't send personally identifiable info
SENTRY_INCLUDE_LOCAL_VARIABLES=false   # Don't include local variables in production
SENTRY_MAX_BREADCRUMBS=50              # Limit breadcrumb data

# Data Scrubbing (automatic):
- Email addresses → [email]
- Phone numbers → [phone]  
- Credit card numbers → [creditcard]
- Social security numbers → [ssn]
```

### Data Retention
```bash
# In Sentry project settings:
Error Event Retention: 30 days (free tier) / 90 days (paid)
Performance Event Retention: 30 days (free tier) / 90 days (paid)
Attachments Retention: 30 days

# For compliance:
- EU users: Data stored in EU region
- Automatic PII scrubbing enabled
- Team member access controls
```

---

## 🛠️ Custom Context & Tags

### Add Business Context to Errors
```python
# Example: Add user context to errors
import sentry_sdk

def add_user_context(user_id: int, email: str, role: str):
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,  # Will be scrubbed automatically
        "role": role
    })

def add_business_context(appointment_id: int, barber_id: int):
    sentry_sdk.set_tag("appointment_id", appointment_id)
    sentry_sdk.set_tag("barber_id", barber_id)
    sentry_sdk.set_context("business", {
        "appointment_id": appointment_id,
        "barber_id": barber_id,
        "environment": "production"
    })
```

### Useful Tags for BookedBarber
```python
# Automatically tag errors with:
- API endpoint
- User role (barber, client, admin)
- Feature area (booking, payments, calendar)
- External service (stripe, sendgrid, twilio)
- Error severity (critical, warning, info)
```

---

## 📊 Dashboard & Monitoring

### Key Sentry Dashboards to Monitor

1. **Issues Dashboard**
   ```bash
   # Daily monitoring:
   - New issues count
   - Unresolved issues
   - Error frequency trends
   - Most common errors
   ```

2. **Performance Dashboard**
   ```bash
   # Weekly monitoring:
   - API endpoint performance
   - Database query performance
   - External service latency
   - User experience metrics
   ```

3. **Release Dashboard**
   ```bash
   # Per deployment:
   - New errors introduced
   - Performance regression
   - Error rate comparison
   - User impact assessment
   ```

### Weekly Review Process
```bash
# Every Monday:
1. Review error trends from past week
2. Identify recurring issues
3. Check performance regression
4. Update alert thresholds if needed
5. Plan fixes for top 5 issues
```

---

## 🚀 Production Deployment Integration

### Release Tracking
```bash
# Add to deployment script:
SENTRY_RELEASE=$(git rev-parse HEAD)

# Update backend-v2/.env:
SENTRY_RELEASE=$SENTRY_RELEASE

# This enables:
- Error tracking per release
- Performance comparison between releases  
- Automatic suspect commit identification
- Release health monitoring
```

### Health Checks Integration
```python
# Add to existing health check endpoint
@app.get("/health")
def health_check():
    health_status = {"status": "healthy"}
    
    # Add Sentry health status
    if sentry_configured:
        try:
            # Test Sentry connectivity
            sentry_sdk.capture_message("Health check", level="info")
            health_status["sentry"] = {"status": "connected"}
        except Exception as e:
            health_status["sentry"] = {"status": "error", "message": str(e)}
    
    return health_status
```

---

## ✅ Verification Checklist

### Immediate Verification (5 minutes)
- [ ] **Backend Errors**: Trigger test error, appears in Sentry
- [ ] **Frontend Errors**: Trigger test error, appears in Sentry  
- [ ] **Performance**: API calls tracked in Sentry Performance
- [ ] **Alerts**: Team notifications configured
- [ ] **Privacy**: PII scrubbing working

### Weekly Verification
- [ ] **Error Trends**: Review weekly error patterns
- [ ] **Performance**: Check for performance degradation
- [ ] **Alerts**: Verify alert delivery working
- [ ] **Team Access**: Ensure team can access relevant data
- [ ] **Data Retention**: Confirm data retention policies

---

## 💰 Sentry Pricing Considerations

### Free Tier Limits
```bash
Errors: 5,000 errors/month
Performance: 10,000 transactions/month
Team Members: 1 member
Data Retention: 30 days
```

### Recommended Production Plan
```bash
Team Plan: $26/month
Errors: 50,000 errors/month  
Performance: 100,000 transactions/month
Team Members: Unlimited
Data Retention: 90 days
Advanced Features: Custom dashboards, advanced sampling
```

### Cost Optimization
```bash
# Optimize sampling rates:
SENTRY_SAMPLE_RATE=0.8           # Sample 80% of errors
SENTRY_TRACES_SAMPLE_RATE=0.05   # Sample 5% of performance events

# Filter out noise:
- Ignore health check requests
- Filter out known third-party errors
- Sample high-frequency low-impact errors
```

---

## 🆘 Troubleshooting Common Issues

### Issue: No Events in Sentry
```bash
# Check:
1. DSN URL is correct
2. Network connectivity to sentry.io
3. Environment variables loaded correctly
4. Sentry SDK initialized in code

# Debug:
SENTRY_DEBUG=true  # Enable debug logging
```

### Issue: Too Many Events
```bash
# Solution:
1. Increase sampling rates
2. Add error filtering
3. Ignore known issues
4. Upgrade Sentry plan
```

### Issue: Missing Context
```bash
# Solution:
1. Add custom tags and context
2. Configure user context
3. Add business-specific metadata
4. Enable breadcrumbs
```

---

## 🎯 Success Metrics

### After 1 Week
- [ ] **Error Detection**: All production errors captured
- [ ] **Response Time**: Errors resolved <24 hours
- [ ] **Coverage**: Frontend + Backend monitoring active
- [ ] **Team Adoption**: All developers using Sentry for debugging

### After 1 Month  
- [ ] **Error Reduction**: 50% reduction in recurring errors
- [ ] **Performance**: No performance regressions missed
- [ ] **Proactive**: Issues caught before customer reports
- [ ] **Insights**: Business intelligence from error patterns

---

**💡 SUCCESS INDICATOR**: When this setup is complete, you'll have full visibility into production errors and performance, enabling proactive issue resolution before customers are impacted.