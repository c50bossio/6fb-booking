# Monitoring Configuration Files

This directory contains comprehensive production-ready monitoring configuration for the 6FB Booking Platform.

## 📁 Configuration Files

### Core Monitoring Setup
- **`sentry-production.yml`** - Sentry error tracking and performance monitoring configuration
- **`google-analytics-setup.yml`** - Google Analytics 4 setup with custom events and conversions
- **`uptimerobot-monitors.json`** - UptimeRobot uptime monitoring configuration with all endpoints
- **`production.env.monitoring`** - All environment variables needed for production monitoring

### Advanced Monitoring
- **`performance-dashboard.yml`** - Performance monitoring dashboard and Core Web Vitals setup
- **`alerting-rules.yml`** - Comprehensive alerting rules with proper escalation and notifications

### Documentation
- **`../PRODUCTION_MONITORING_SETUP_GUIDE.md`** - Complete step-by-step setup guide (start here!)

## 🚀 Quick Setup Guide

### 1. Start with the Main Guide
Read the **[Production Monitoring Setup Guide](../PRODUCTION_MONITORING_SETUP_GUIDE.md)** for step-by-step instructions.

### 2. Configure Environment Variables
Copy relevant variables from `production.env.monitoring` to your production `.env` file.

### 3. Set Up External Services
Use the configuration files to set up:
- **Sentry Projects** (using `sentry-production.yml`)
- **UptimeRobot Monitors** (using `uptimerobot-monitors.json`)
- **Google Analytics** (using `google-analytics-setup.yml`)

### 4. Configure Alerts
Use `alerting-rules.yml` to set up proper alert routing and escalation.

### 5. Set Up Dashboard
Use `performance-dashboard.yml` for performance monitoring and dashboard configuration.

## 📊 What You Get

### Error Tracking & Performance (Sentry)
- Real-time error tracking and alerts
- Performance monitoring with traces
- Release tracking and deployment monitoring
- Custom alert rules for payment failures

### Uptime Monitoring (UptimeRobot)
- 24/7 uptime monitoring from multiple locations
- Health check monitoring for all critical endpoints
- Public status page for users
- SMS/email/Slack alerts for downtime

### User Analytics (Google Analytics 4)
- User behavior tracking and conversion funnels
- Custom event tracking for bookings and payments
- Business metrics dashboard
- Real-time user activity monitoring

### Performance Monitoring (Built-in)
- Core Web Vitals tracking
- Database performance monitoring
- API response time tracking
- System resource monitoring

### Security Monitoring (Built-in)
- Failed login attempt detection
- CSP violation monitoring
- API abuse detection
- Security headers validation

### Business Metrics (Built-in)
- Booking conversion rate tracking
- Payment success rate monitoring
- Revenue tracking and alerts
- User engagement metrics

## 🔧 Monitoring Endpoints

The platform provides these monitoring endpoints:

### Health Checks
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Comprehensive system health
- `GET /api/v1/health/live` - Kubernetes liveness probe
- `GET /api/v1/health/ready` - Kubernetes readiness probe
- `GET /api/v1/uptime` - Simple uptime check

### Specialized Monitoring
- `GET /api/v1/health/payments` - Payment system health
- `GET /api/v1/health/database` - Database performance
- `GET /api/v1/health/security` - Security monitoring
- `GET /api/v1/health/metrics` - System metrics

### Security Endpoints
- `POST /api/v1/security/csp-report` - CSP violation reporting
- `GET /api/v1/security/security-headers` - Security headers status

## 🎯 Alert Levels

### Critical Alerts (Immediate Response)
- System down or API failures
- Payment processing failures (>5% failure rate)
- Database connectivity issues
- Security breaches or high-risk events

### Warning Alerts (1-hour Response)
- Performance degradation
- High resource usage (CPU/Memory >80%)
- Elevated error rates (3-10%)
- Security events (CSP violations, suspicious activity)

### Info Alerts (Daily Review)
- Business metrics trends
- Low-severity security events
- Performance optimization opportunities

## 📈 Performance Budgets

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### API Performance Targets
- **Auth endpoints**: < 200ms
- **Booking endpoints**: < 500ms
- **Payment endpoints**: < 1s
- **Search endpoints**: < 300ms

### System Resource Targets
- **CPU usage**: < 70%
- **Memory usage**: < 80%
- **Disk usage**: < 85%

## 🔒 Security Monitoring

### Threat Detection
- Failed login attempt spikes (>50/minute)
- Unauthorized API access attempts
- CSP violation spikes (>20/minute)
- Suspicious payment activity

### Compliance Monitoring
- Security header validation
- GDPR compliance checks
- PCI DSS compliance monitoring
- Data retention policy enforcement

## 💰 Cost Optimization

### Free Tier Usage
- **Sentry**: 5,000 errors/month
- **UptimeRobot**: 50 monitors, 5-minute intervals
- **Google Analytics**: Unlimited usage
- **Built-in Monitoring**: No additional cost

**Total Monthly Cost**: $0 (free tier)

### Paid Upgrades (Optional)
- **Sentry Pro**: $26/month (enhanced features)
- **UptimeRobot Pro**: $5/month (1-minute intervals)
- **Additional Tools**: $15-50/month

**Estimated Monthly Cost**: $30-80/month

## 🛠️ Customization

### Environment-Specific Configuration
Each configuration file supports environment-specific settings:
- **Development**: Relaxed thresholds, verbose logging
- **Staging**: Production-like settings, reduced sampling
- **Production**: Strict thresholds, optimized sampling

### Custom Alert Rules
You can customize alert rules in `alerting-rules.yml`:
- Adjust thresholds based on your traffic patterns
- Add business-specific metrics
- Customize notification channels
- Set up maintenance windows

### Dashboard Customization
Modify `performance-dashboard.yml` to:
- Add custom metrics panels
- Adjust time ranges and aggregations
- Create business-specific dashboards
- Set up automated reports

## 📋 Maintenance

### Daily Tasks (5 minutes)
- Review monitoring dashboard
- Check active alerts
- Verify system health

### Weekly Tasks (15 minutes)
- Review uptime reports
- Analyze performance trends
- Update alert thresholds if needed

### Monthly Tasks (30 minutes)
- Full monitoring system health check
- Review and optimize alert rules
- Analyze business metrics
- Update documentation

## 🆘 Emergency Response

### When Critical Alerts Fire
1. **Acknowledge** alert within 5 minutes
2. **Check** status page and dashboards
3. **Follow** runbook procedures
4. **Update** status page with incident info
5. **Communicate** with team

### Escalation Path
- **Level 1**: admin@6fb-booking.com (immediate)
- **Level 2**: devops@6fb-booking.com (after 15 min)
- **Level 3**: manager@6fb-booking.com (after 30 min)

## 📞 Support

### Documentation
- **Main Setup Guide**: `../PRODUCTION_MONITORING_SETUP_GUIDE.md`
- **Sentry Docs**: [docs.sentry.io](https://docs.sentry.io)
- **UptimeRobot Help**: [uptimerobot.com/help](https://uptimerobot.com/help)
- **Google Analytics Support**: [support.google.com/analytics](https://support.google.com/analytics)

### Configuration Help
Each configuration file contains:
- Detailed comments explaining each setting
- Example values and formats
- Links to relevant documentation
- Common troubleshooting tips

This monitoring infrastructure provides enterprise-grade monitoring while remaining cost-effective and easy to maintain.
