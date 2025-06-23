# 6FB Booking Platform - Comprehensive Monitoring System

A complete monitoring solution for the 6FB Booking Platform that provides real-time uptime monitoring, performance tracking, deployment alerts, error aggregation, and health reporting.

## Features

### 🔍 Uptime Monitoring
- Real-time monitoring of frontend, backend, database, and API endpoints
- Configurable check intervals and alert thresholds
- Automatic failure detection and notification
- 24/7 continuous monitoring with auto-recovery

### 📊 Performance Monitoring
- API response time tracking with percentile calculations
- Frontend page load time monitoring
- SLA compliance tracking
- Performance trend analysis
- Automated slow endpoint detection

### 🚀 Deployment Monitoring
- Render, Vercel, and GitHub Actions integration
- Deployment completion alerts
- Health check verification after deployments
- Failed deployment notifications
- Deployment history tracking

### 🎯 Status Dashboard
- Real-time status page at `http://localhost:8080`
- Service health overview
- Performance metrics visualization
- Incident tracking
- Mobile-responsive design

### 📈 Error Aggregation
- Centralized error collection from all services
- Error classification and deduplication
- Critical error alerting
- Error trend analysis
- Stack trace capture

### 📋 Daily Health Reports
- Comprehensive daily system health summaries
- Executive-level health status
- Performance SLA compliance tracking
- Automated recommendations
- Email delivery with charts and metrics

## Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# Clone and navigate to monitoring directory
cd monitoring

# Copy and configure environment
cp config/.env.monitoring.template config/.env.monitoring
# Edit config/.env.monitoring with your settings

# Start all monitoring services
docker-compose -f config/docker-compose.monitoring.yml up -d

# View status
docker-compose -f config/docker-compose.monitoring.yml ps

# View logs
docker-compose -f config/docker-compose.monitoring.yml logs -f
```

### Option 2: Direct Installation

```bash
# Navigate to setup directory
cd monitoring/setup

# Run installation script
chmod +x install.sh
./install.sh

# Configure environment
nano ../config/.env.monitoring

# Test system
../scripts/monitoring-control.sh test

# Start monitoring services
../scripts/monitoring-control.sh start
```

## Configuration

### Environment Variables

Edit `monitoring/config/.env.monitoring`:

```bash
# Email Alerts
ENABLE_EMAIL_ALERTS=true
SENDGRID_API_KEY=your_api_key
ALERT_TO_EMAILS=admin@6fb-booking.com

# Service URLs
FRONTEND_URL=https://6fb-booking.vercel.app
BACKEND_URL=https://sixfb-backend.onrender.com

# Deployment APIs
RENDER_API_KEY=your_render_key
VERCEL_TOKEN=your_vercel_token
GITHUB_TOKEN=your_github_token

# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Service Configuration

Each monitoring component can be configured via environment variables:

- **Check Intervals**: Default 5 minutes for uptime, 15 minutes for performance
- **Alert Thresholds**: 3 consecutive failures trigger alerts
- **SLA Targets**: 1000ms for API, 3000ms for frontend
- **Report Schedule**: Daily at 6 AM

## Monitoring Components

### 1. Uptime Monitor (`uptime-monitor.py`)
```bash
# Service endpoints monitored:
- Backend Health: /health
- API Endpoints: /api/v1/services
- Frontend: Main application
- Database: Connection check

# Features:
- Multi-endpoint monitoring
- Failure count tracking
- Email and webhook alerts
- Automatic retry logic
```

### 2. Performance Monitor (`performance-monitor.py`)
```bash
# Metrics collected:
- API response times (min, max, mean, P95)
- Frontend load times
- Success rates
- SLA compliance

# Advanced features:
- Percentile calculations
- Performance trending
- Slow endpoint identification
```

### 3. Deployment Monitor (`deployment-monitor.py`)
```bash
# Platforms supported:
- Render (backend deployments)
- Vercel (frontend deployments)
- GitHub Actions (CI/CD workflows)

# Features:
- Deployment completion detection
- Health check verification
- Multi-channel alerting
```

### 4. Error Aggregator (`error-aggregator.py`)
```bash
# Error sources:
- Backend application logs
- Frontend client errors
- Deployment failures
- System errors

# Processing:
- Error classification
- Deduplication by fingerprint
- Severity assessment
- Trend analysis
```

### 5. Status Page (`status-page/`)
```bash
# Real-time dashboard:
- Service status overview
- Performance metrics
- Uptime statistics
- Recent incidents

# API endpoints:
- /api/status - Current system status
- /health - Status page health
```

### 6. Daily Reporter (`daily-health-report.py`)
```bash
# Report sections:
- Executive summary with health score
- Service uptime analysis
- Performance SLA compliance
- Error summary and trends
- Deployment activity
- Actionable recommendations

# Delivery:
- HTML email with charts
- JSON data attachment
- Automated scheduling
```

## Usage Examples

### Check System Status
```bash
# Via API
curl http://localhost:8080/api/status

# Via control script
./scripts/monitoring-control.sh status

# View logs
./scripts/monitoring-control.sh logs
```

### Generate Health Report
```bash
# Manual report generation
cd scripts
python3 daily-health-report.py

# View recent reports
ls -la /var/log/6fb-monitoring/reports/
```

### Test Alert System
```bash
# Trigger test alert (will cause monitoring failure)
sudo systemctl stop nginx  # or another service

# Check alert delivery
tail -f /var/log/6fb-monitoring/uptime.log
```

## Alerting Channels

### Email Alerts
- Uptime failures
- Performance degradation
- Deployment completions
- Daily health reports

### Webhook/Slack Integration
```bash
# Configure Slack webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Message format includes:
- Service name and status
- Error details
- Performance metrics
- Deployment information
```

### Custom Webhooks
```bash
# Send to custom endpoint
ALERT_WEBHOOK_URL=https://your-system.com/alerts

# Payload includes:
{
  "service": "backend",
  "status": "down",
  "timestamp": "2024-01-01T00:00:00Z",
  "details": {...}
}
```

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check systemd status
sudo systemctl status 6fb-uptime-monitor.service

# Check logs
journalctl -u 6fb-uptime-monitor.service -f

# Verify permissions
ls -la /var/log/6fb-monitoring/
```

**Missing dependencies:**
```bash
# Reinstall requirements
pip install -r monitoring/setup/requirements.txt

# Test imports
python3 -c "import requests, aiohttp, flask, matplotlib"
```

**Status page not accessible:**
```bash
# Check if port is in use
sudo netstat -tlnp | grep :8080

# Restart status page service
sudo systemctl restart 6fb-status-page.service
```

**Alerts not sending:**
```bash
# Verify email configuration
echo "Test email" | mail -s "Test" your@email.com

# Check SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json"
```

### Log Locations

```bash
# Service logs
/var/log/6fb-monitoring/uptime.log
/var/log/6fb-monitoring/performance.log
/var/log/6fb-monitoring/deployment.log
/var/log/6fb-monitoring/error-aggregator.log

# Metrics data
/var/log/6fb-monitoring/metrics/
/var/log/6fb-monitoring/errors/
/var/log/6fb-monitoring/reports/

# System logs
journalctl -u 6fb-*-monitor.service
```

## Customization

### Adding New Services
```python
# In uptime-monitor.py
SERVICES = {
    'new_service': {
        'url': 'https://your-service.com/health',
        'timeout': 30,
        'expected_status': 200,
        'check_interval': 300,
    }
}
```

### Custom Metrics
```python
# In performance-monitor.py
API_ENDPOINTS = [
    {
        'name': 'custom_endpoint',
        'url': 'https://api.example.com/custom',
        'method': 'GET',
        'expected_time': 500,
    }
]
```

### Alert Customization
```python
# Custom alert logic in uptime-monitor.py
def custom_alert_logic(service_name, check_result):
    # Your custom alert conditions
    if condition_met:
        send_custom_alert(service_name, check_result)
```

## Maintenance

### Regular Tasks

**Weekly:**
- Review health reports
- Check alert effectiveness
- Validate monitoring coverage

**Monthly:**
- Update monitoring thresholds
- Review error patterns
- Optimize performance checks

**Quarterly:**
- Update dependencies
- Review monitoring strategy
- Performance tuning

### Backup and Recovery

```bash
# Backup monitoring data
tar -czf monitoring-backup-$(date +%Y%m%d).tar.gz /var/log/6fb-monitoring/

# Restore from backup
tar -xzf monitoring-backup-20240101.tar.gz -C /
```

## Integration with CI/CD

### GitHub Actions Integration
```yaml
# .github/workflows/monitoring.yml
- name: Notify Monitoring
  run: |
    curl -X POST ${{ secrets.MONITORING_WEBHOOK }} \
      -H "Content-Type: application/json" \
      -d '{"event": "deployment", "status": "success"}'
```

### Deployment Hooks
```bash
# Post-deployment health check
curl -f http://localhost:8080/api/status || exit 1
```

## Security Considerations

- All API keys stored in environment variables
- Log files have restricted permissions
- Status page can be secured with basic auth
- Webhook URLs use HTTPS
- Error logs sanitized of sensitive data

## Performance Impact

- Minimal CPU usage (< 1% average)
- Low memory footprint (< 100MB total)
- Network traffic: ~1MB/day per service
- Storage: ~10MB/day for all logs and metrics

## License

This monitoring system is part of the 6FB Booking Platform and follows the same licensing terms.
