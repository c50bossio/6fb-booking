# Production Monitoring Setup Guide - 6FB Booking Platform

## Overview
This guide provides step-by-step instructions to set up comprehensive monitoring infrastructure for the 6FB Booking Platform production deployment. The monitoring system includes error tracking, performance monitoring, uptime monitoring, analytics, and alerting.

## 🏁 Quick Start Checklist

### Prerequisites (5 minutes)
- [ ] Production server deployed and accessible
- [ ] Domain name configured (e.g., `6fb-booking.com`)
- [ ] SSL certificate installed and working
- [ ] Admin email addresses ready for alerts
- [ ] Slack workspace setup (optional but recommended)

### Required Accounts (15 minutes total)
1. **Sentry Account** (5 min) - [sentry.io](https://sentry.io)
2. **UptimeRobot Account** (5 min) - [uptimerobot.com](https://uptimerobot.com)
3. **Google Analytics Account** (5 min) - [analytics.google.com](https://analytics.google.com)

---

## 1. Sentry Error Tracking Setup

### Step 1: Create Sentry Projects (5 minutes)

1. **Sign up/Login** to [Sentry.io](https://sentry.io)
2. **Create Organization**: "6FB Booking"
3. **Create Backend Project**:
   - Platform: Python
   - Name: "6fb-booking-backend"
   - Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/123456`)
4. **Create Frontend Project**:
   - Platform: JavaScript (React/Next.js)
   - Name: "6fb-booking-frontend"
   - Copy the DSN

### Step 2: Configure Environment Variables

Add to your production `.env` file:
```bash
# Sentry Configuration
SENTRY_DSN=https://your-backend-dsn@o123456.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=6fb-booking@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1

# Frontend Sentry (add to frontend .env.local)
NEXT_PUBLIC_SENTRY_DSN=https://your-frontend-dsn@o123456.ingest.sentry.io/123457
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### Step 3: Configure Alerts (10 minutes)

1. **Go to Alerts** in Sentry dashboard
2. **Create Alert Rules**:
   - **High Error Rate**: `event.count:>50` in 1 minute
   - **Payment Failures**: Filter by transaction `/api/v1/payments` with status `>=400`
   - **Performance Issues**: `measurements.fcp:>3000` (3 second page loads)

3. **Set up Notifications**:
   - Add email: `admin@6fb-booking.com`
   - Add Slack webhook (optional): Your Slack webhook URL

---

## 2. UptimeRobot Monitoring Setup

### Step 1: Create UptimeRobot Account (2 minutes)
1. Sign up at [UptimeRobot.com](https://uptimerobot.com)
2. Verify email and login

### Step 2: Create Monitors (10 minutes)

Create these monitors in order of priority:

#### Monitor 1: Main Health Check (Critical)
- **Monitor Type**: HTTP(s)
- **URL**: `https://your-domain.com/api/v1/health`
- **Friendly Name**: `6FB Booking - API Health`
- **Interval**: 5 minutes
- **Keyword**: `"status":"healthy"`

#### Monitor 2: Website Availability
- **Monitor Type**: HTTP(s)
- **URL**: `https://your-domain.com`
- **Friendly Name**: `6FB Booking - Website`
- **Interval**: 5 minutes
- **Keyword**: `6FB Booking` (in page content)

#### Monitor 3: Payment System
- **Monitor Type**: HTTP(s)
- **URL**: `https://your-domain.com/api/v1/health/payments`
- **Friendly Name**: `6FB Booking - Payments`
- **Interval**: 10 minutes

#### Monitor 4: Simple Uptime (Fast Detection)
- **Monitor Type**: HTTP(s)
- **URL**: `https://your-domain.com/api/v1/uptime`
- **Friendly Name**: `6FB Booking - Quick Check`
- **Interval**: 3 minutes
- **Keyword**: `"ok":true`

### Step 3: Configure Alerts (5 minutes)

1. **Add Alert Contacts**:
   - **Email**: `admin@6fb-booking.com`
   - **Slack** (optional): Your Slack webhook
   - **SMS** (optional): Your phone number

2. **Alert Settings**:
   - Alert when down for: 2 consecutive checks
   - Resend notifications: Every 60 minutes
   - Send recovery notifications: Yes

### Step 4: Create Status Page (5 minutes)

1. **Go to Status Pages** → **Add Status Page**
2. **Subdomain**: `status` (creates `status.your-domain.com`)
3. **Select Monitors**: Choose all 4 monitors created above
4. **Customize**:
   - Title: "6FB Booking Platform Status"
   - Logo: Upload your logo
   - Custom message: "Real-time status for the 6FB Booking Platform"

---

## 3. Google Analytics 4 Setup

### Step 1: Create GA4 Property (5 minutes)

1. **Go to** [Google Analytics](https://analytics.google.com)
2. **Create Account**: "6FB Booking"
3. **Create Property**:
   - Property name: "6FB Booking Platform"
   - Timezone: Your timezone
   - Currency: USD
4. **Add Data Stream**:
   - Platform: Web
   - Website URL: `https://your-domain.com`
   - Stream name: "6FB Booking Website"
5. **Copy Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Configure Environment Variables

Add to frontend `.env.local`:
```bash
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

### Step 3: Set Up Custom Events (10 minutes)

The platform automatically tracks these events:
- `booking_started` - User begins booking flow
- `booking_completed` - Booking successfully completed
- `payment_started` - Payment process initiated
- `purchase` - Payment completed successfully
- `sign_up` - User registration
- `login` - User authentication

**Configure Conversions**:
1. **Go to** Events → **Conversions**
2. **Mark as conversions**:
   - `booking_completed`
   - `purchase`
   - `sign_up`

### Step 4: Set Up Alerts (5 minutes)

1. **Go to** Admin → **Custom Insights**
2. **Create Alert**:
   - Name: "Booking Conversion Drop"
   - Metric: `booking_completed`
   - Condition: Decrease more than 20%
   - Email: `admin@6fb-booking.com`

---

## 4. Performance Monitoring Configuration

### Step 1: Enable Built-in Monitoring

The application includes comprehensive monitoring services. Ensure these environment variables are set:

```bash
# Performance Monitoring
PERFORMANCE_MONITORING_ENABLED=true
WEB_VITALS_ENDPOINT=/api/v1/analytics/performance

# Security Monitoring
SECURITY_MONITORING_ENABLED=true
CSP_REPORT_ENDPOINT=/api/v1/security/csp-report
```

### Step 2: Verify Monitoring Endpoints

Test these URLs in your browser (should return JSON):
- `https://your-domain.com/api/v1/health` - Basic health
- `https://your-domain.com/api/v1/health/detailed` - Comprehensive health
- `https://your-domain.com/api/v1/health/payments` - Payment monitoring
- `https://your-domain.com/api/v1/health/database` - Database performance
- `https://your-domain.com/api/v1/health/security` - Security monitoring

---

## 5. Slack Integration (Optional - 10 minutes)

### Step 1: Create Slack Workspace/Channels

1. **Create channels**:
   - `#alerts-critical` - Critical system alerts
   - `#alerts-warning` - Warning alerts
   - `#monitoring` - General monitoring updates

### Step 2: Create Slack Webhooks

1. **Go to** [Slack API](https://api.slack.com/apps)
2. **Create App** → "From scratch"
3. **App Name**: "6FB Monitoring"
4. **Add Incoming Webhooks**:
   - Create webhook for `#alerts-critical`
   - Create webhook for `#alerts-warning`
   - Copy webhook URLs

### Step 3: Configure Integrations

Add webhook URLs to:
- **Sentry** → Project Settings → Alerts → Integrations
- **UptimeRobot** → Alert Contacts → Slack integration

---

## 6. Verification and Testing

### Step 1: Test All Monitoring Endpoints (5 minutes)

Run these commands to verify monitoring is working:

```bash
# Test basic health
curl https://your-domain.com/api/v1/health

# Test detailed health
curl https://your-domain.com/api/v1/health/detailed

# Test payment monitoring
curl https://your-domain.com/api/v1/health/payments

# Test uptime endpoint
curl https://your-domain.com/api/v1/uptime
```

All should return status 200 with `"status": "healthy"` or `"ok": true`.

### Step 2: Test Error Tracking (5 minutes)

1. **Trigger test error** (backend):
```bash
curl https://your-domain.com/api/v1/debug/test-error
```

2. **Check Sentry**: Error should appear in Sentry dashboard within 1 minute

### Step 3: Test Uptime Monitoring (5 minutes)

1. **Temporarily stop** your application
2. **Wait 5-10 minutes** for UptimeRobot to detect downtime
3. **Check email/Slack** for downtime alerts
4. **Restart application** and verify recovery notifications

### Step 4: Test Analytics (5 minutes)

1. **Visit your website** in an incognito browser
2. **Complete a test booking** (if possible)
3. **Check Google Analytics** → Real-time → Events
4. **Verify events** are being tracked

---

## 7. Production Checklist

### Critical Monitoring (Must Have)
- [ ] Sentry error tracking configured and tested
- [ ] UptimeRobot monitoring all critical endpoints
- [ ] Google Analytics tracking user behavior
- [ ] Alert notifications going to correct email addresses
- [ ] Status page accessible and showing all services

### Security Monitoring (Recommended)
- [ ] Security headers monitoring enabled
- [ ] CSP violation reporting configured
- [ ] Failed login attempt monitoring active
- [ ] Payment fraud detection alerts working

### Performance Monitoring (Recommended)
- [ ] Core Web Vitals tracking enabled
- [ ] Database query monitoring active
- [ ] Response time alerts configured
- [ ] Resource usage monitoring enabled

### Business Monitoring (Nice to Have)
- [ ] Conversion rate tracking
- [ ] Revenue monitoring alerts
- [ ] User engagement metrics
- [ ] Booking funnel analysis

---

## 8. Maintenance and Monitoring

### Daily Tasks (Automated)
- Monitor dashboard review (5 minutes)
- Check alert summaries
- Review error rates and trends

### Weekly Tasks (15 minutes)
- Review uptime reports
- Analyze performance trends
- Update alert thresholds if needed
- Check security monitoring reports

### Monthly Tasks (30 minutes)
- Full monitoring system health check
- Review and update alert rules
- Analyze business metrics trends
- Update monitoring documentation

---

## 9. Emergency Response Plan

### When Alerts Fire

#### Critical Alerts (Immediate Response)
1. **Acknowledge alert** within 5 minutes
2. **Check status page** for user impact
3. **Review monitoring dashboards** for root cause
4. **Follow runbook procedures** (if available)
5. **Update status page** with incident information
6. **Communicate with team** via Slack/email

#### Warning Alerts (Response within 1 hour)
1. **Review alert details** and trending
2. **Investigate potential causes**
3. **Plan resolution** if immediate action needed
4. **Schedule fix** if non-urgent

### Escalation Contacts
- **Level 1**: `admin@6fb-booking.com` (Primary)
- **Level 2**: `devops@6fb-booking.com` (After 15 minutes)
- **Level 3**: `manager@6fb-booking.com` (After 30 minutes)

---

## 10. Cost Summary

### Free Tier Usage (Recommended Start)
- **Sentry**: 5,000 errors/month (Free)
- **UptimeRobot**: 50 monitors, 5-minute intervals (Free)
- **Google Analytics**: Unlimited (Free)
- **Built-in Monitoring**: No additional cost

**Total Monthly Cost**: $0

### Paid Upgrades (When Needed)
- **Sentry Pro**: $26/month (Enhanced features)
- **UptimeRobot Pro**: $5/month (1-minute intervals)
- **Additional Monitoring Tools**: $15-50/month

**Estimated Monthly Cost**: $30-80/month

---

## 11. Troubleshooting

### Common Issues

#### Sentry Not Receiving Errors
- Check DSN configuration in environment variables
- Verify network connectivity to Sentry
- Test with manual error trigger

#### UptimeRobot False Positives
- Check keyword monitoring settings
- Verify SSL certificate validity
- Review response time thresholds

#### Google Analytics Not Tracking
- Verify tracking ID configuration
- Check browser ad blockers
- Ensure GDPR compliance settings

#### Monitoring Endpoints Failing
- Check application logs for errors
- Verify database connectivity
- Review environment variable configuration

### Support Resources
- **Sentry Documentation**: [docs.sentry.io](https://docs.sentry.io)
- **UptimeRobot Help**: [uptimerobot.com/help](https://uptimerobot.com/help)
- **Google Analytics Support**: [support.google.com/analytics](https://support.google.com/analytics)

---

## Success Metrics

After setup completion, you should achieve:
- **99.9%+ uptime detection** within 5 minutes
- **Error detection** within 1 minute
- **Performance issue alerts** within 5 minutes
- **Business metric tracking** with daily reports
- **Security threat detection** in real-time

This monitoring infrastructure provides enterprise-grade monitoring for the 6FB Booking Platform while remaining cost-effective and easy to maintain.
