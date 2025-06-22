# Uptime Monitoring Setup Guide

## Overview
This guide sets up comprehensive uptime monitoring for the 6FB Booking Platform using multiple monitoring services for redundancy and comprehensive coverage.

## 1. UptimeRobot Setup (Free Tier)

### Account Setup
1. Go to [UptimeRobot.com](https://uptimerobot.com)
2. Create a free account (supports up to 50 monitors)
3. Verify email and log in

### Monitor Configuration

#### Primary Health Check Monitor
- **Monitor Type**: HTTP(s)
- **Friendly Name**: `6FB Booking - Health Check`
- **URL**: `https://your-domain.com/api/v1/health`
- **Monitoring Interval**: 5 minutes (free tier)
- **HTTP Method**: GET
- **Expected Status Code**: 200
- **Keyword Monitoring**: Enable and look for `"status":"healthy"`

#### API Endpoints Monitor
- **Monitor Type**: HTTP(s)
- **Friendly Name**: `6FB Booking - API Status`
- **URL**: `https://your-domain.com/api/v1/uptime`
- **Monitoring Interval**: 5 minutes
- **HTTP Method**: GET
- **Expected Status Code**: 200
- **Keyword Monitoring**: Enable and look for `"ok":true`

#### Frontend Monitor
- **Monitor Type**: HTTP(s)
- **Friendly Name**: `6FB Booking - Frontend`
- **URL**: `https://your-domain.com`
- **Monitoring Interval**: 5 minutes
- **HTTP Method**: GET
- **Expected Status Code**: 200

### Alert Contacts Setup
1. Go to "My Settings" → "Alert Contacts"
2. Add Email Alert:
   - **Type**: Email
   - **Friendly Name**: Primary Admin Email
   - **Email**: your-admin@email.com
   - **Send alerts when**: Down & Up
3. Add Slack Integration (if using Slack):
   - **Type**: Slack
   - **Webhook URL**: Your Slack webhook URL
   - **Channel**: #alerts or #monitoring

### Advanced Settings
- **Alert Threshold**: Alert when down for 2 consecutive checks
- **Resend Notifications**: Every 60 minutes until back up
- **Include monitoring logs**: Yes
- **SSL Monitoring**: Enable for HTTPS endpoints

## 2. Alternative Monitoring Services

### Pingdom (Paid - More Features)
1. Sign up at [Pingdom.com](https://pingdom.com)
2. Create monitors for same endpoints
3. Set up more granular alerting rules
4. Enable real user monitoring (RUM)

### StatusCake (Free/Paid Options)
1. Register at [StatusCake.com](https://statuscake.com)
2. Create uptime tests for all endpoints
3. Configure global monitoring locations
4. Set up maintenance windows

### Freshping (Free Tier Available)
1. Go to [Freshping.com](https://freshping.com)
2. Create status page and monitors
3. Set up public status page for users

## 3. Custom Monitoring Endpoints

The application provides several health check endpoints:

### `/api/v1/health` - Basic Health Check
```json
{
  "status": "healthy",
  "timestamp": "2025-06-22T14:00:00Z",
  "service": "6fb-booking-api",
  "version": "1.0.0",
  "database": "healthy"
}
```

### `/api/v1/health/detailed` - Comprehensive Health
```json
{
  "status": "healthy",
  "timestamp": "2025-06-22T14:00:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 45.2
    },
    "external_services": {
      "stripe": {
        "status": "healthy",
        "response_time_ms": 120.5
      }
    },
    "system_metrics": {
      "status": "healthy",
      "cpu_percent": 25.5,
      "memory_percent": 65.2
    }
  },
  "response_time_ms": 165.7
}
```

### `/api/v1/uptime` - Minimal Uptime Check
```json
{
  "ok": true,
  "timestamp": "2025-06-22T14:00:00Z",
  "service": "6fb-booking"
}
```

### `/api/v1/health/live` - Kubernetes Liveness
```json
{
  "status": "alive",
  "timestamp": "2025-06-22T14:00:00Z"
}
```

### `/api/v1/health/ready` - Kubernetes Readiness
```json
{
  "status": "ready",
  "timestamp": "2025-06-22T14:00:00Z",
  "service": "6fb-booking-api"
}
```

## 4. Monitoring Best Practices

### Monitor Selection Strategy
1. **Primary**: Use `/api/v1/uptime` for fast, lightweight checks
2. **Secondary**: Use `/api/v1/health` for basic health validation
3. **Detailed**: Use `/api/v1/health/detailed` for diagnostic monitoring
4. **Frontend**: Monitor main application URL for user experience

### Alert Escalation
1. **Level 1**: Single check failure → Log only
2. **Level 2**: 2 consecutive failures → Email alert
3. **Level 3**: 5 consecutive failures → SMS/Phone alert
4. **Level 4**: 10+ minute outage → Escalate to on-call

### Geographic Distribution
Set up monitoring from multiple locations:
- North America (East & West Coast)
- Europe
- Asia
- Use at least 3 locations for accurate detection

## 5. Status Page Setup

### Create Public Status Page
1. Use UptimeRobot's status page feature
2. Configure custom domain (status.yourdomain.com)
3. Include key services:
   - Website
   - API
   - Payment Processing
   - Database
   - Authentication

### Status Page Content
```
6FB Booking Platform Status

Current Status: All Systems Operational

Services:
✅ Website (6fb-booking.com)
✅ Booking API
✅ Payment Processing
✅ User Authentication
✅ Database Systems
✅ Mobile Application

Uptime (Last 30 days): 99.95%
```

## 6. Integration with Internal Systems

### Webhook Configuration
Set up webhooks to integrate with internal systems:

```json
{
  "webhook_url": "https://your-domain.com/api/v1/monitoring/uptime-webhook",
  "events": ["down", "up", "ssl_expiry"],
  "secret": "your-webhook-secret"
}
```

### Slack Integration
Create Slack webhook for team notifications:
```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"🚨 6FB Booking Platform is DOWN! Duration: 5 minutes"}' \
YOUR_SLACK_WEBHOOK_URL
```

### Email Templates
Configure custom email templates for different alert types:

**Downtime Alert:**
```
Subject: 🚨 6FB Booking Platform - Service Down

The 6FB Booking Platform is currently experiencing downtime.

Service: {monitor_friendly_name}
Status: DOWN
Duration: {duration}
Last Check: {datetime}

This is an automated alert from UptimeRobot.
```

**Recovery Alert:**
```
Subject: ✅ 6FB Booking Platform - Service Restored

The 6FB Booking Platform is back online.

Service: {monitor_friendly_name}
Status: UP
Downtime Duration: {total_duration}
Restored: {datetime}

This is an automated alert from UptimeRobot.
```

## 7. Monitoring Checklist

### Pre-Launch
- [ ] Configure all monitoring endpoints
- [ ] Test alert notifications
- [ ] Set up status page
- [ ] Configure multiple monitoring locations
- [ ] Test webhook integrations

### Post-Launch
- [ ] Monitor for false positives
- [ ] Adjust alert thresholds
- [ ] Review uptime reports weekly
- [ ] Update status page during maintenance
- [ ] Conduct monthly monitoring tests

### Monthly Reviews
- [ ] Review uptime statistics
- [ ] Analyze downtime incidents
- [ ] Update monitoring configurations
- [ ] Test disaster recovery procedures
- [ ] Review and update contact information

## 8. Emergency Response

### Incident Response Plan
1. **Detection**: Automated alerts trigger
2. **Assessment**: Check detailed health endpoint
3. **Response**: Follow runbook procedures
4. **Communication**: Update status page
5. **Resolution**: Fix issues and confirm monitoring
6. **Post-mortem**: Document and improve

### Escalation Contacts
```
Primary: Admin Email (responds within 15 minutes)
Secondary: SMS to on-call engineer (within 5 minutes)
Tertiary: Phone call to emergency contact (immediate)
```

This monitoring setup provides comprehensive coverage with redundancy and ensures rapid detection of any service issues.
