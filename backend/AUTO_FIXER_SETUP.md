# 🤖 Enhanced Auto-Fixer Setup Guide

## Quick Start

1. **Run the upgrade script:**
   ```bash
   ./upgrade_auto_fixer.sh
   ```

2. **Configure notifications in `.env`:**
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   NOTIFICATION_EMAILS=dev-team@6fbmentorship.com,alerts@6fbmentorship.com
   ```

3. **Start the enhanced auto-fixer:**
   ```bash
   ./start-enhanced-auto-fixer.sh
   ```

4. **Open the monitoring dashboard:**
   ```bash
   open auto_fixer_dashboard.html
   ```

## Features Overview

### 🔔 Notifications
- **Slack:** Real-time alerts for fixes and failures
- **Email:** Detailed reports for critical errors
- **Weekly Reports:** Automated performance summaries

### 🧠 Pattern Learning
- Tracks success/failure rates for each error pattern
- Automatically adjusts confidence scores
- Disables patterns with low success rates

### 🛡️ Safety Features
- **Rate Limiting:** Max 10 fixes/minute, 50/hour
- **Circuit Breaker:** Stops after 5 consecutive failures
- **Auto-Rollback:** Reverts changes if error rate spikes
- **Health Monitoring:** Continuous system health checks

### 📊 Smart Features
- **Error Grouping:** Prevents duplicate fixes
- **Performance Monitoring:** Tracks API response times
- **Database Migration Helper:** Suggests safe schema changes
- **Approval Workflows:** Routes risky fixes for review

## Configuration

### Basic Settings (`.env`)
```bash
# Sentry Integration
SENTRY_INTEGRATION_TOKEN=your-token
SENTRY_CLIENT_SECRET=your-secret

# Claude AI
ANTHROPIC_API_KEY=your-anthropic-key

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
NOTIFICATION_EMAILS=team@company.com

# Database (for pattern learning)
DATABASE_URL=sqlite:///./auto_fixer.db
```

### Advanced Settings (`auto_fixer_config.yaml`)
- Adjust rate limits
- Configure error type behaviors
- Set confidence thresholds
- Customize notification rules

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /status` | System status and recent fixes |
| `GET /patterns` | Learned error patterns |
| `POST /patterns/{id}/toggle` | Enable/disable pattern |
| `GET /performance` | Performance metrics |
| `GET /health` | Health check |

## Monitoring

### Web Dashboard
Access at `http://localhost:8003/` after starting the service:
- Real-time fix status
- Success rate charts
- Pattern confidence scores
- Recent fix history

### Slack Integration
Receive instant notifications:
- ✅ Successful fixes
- ❌ Failed fixes
- ⚠️ Manual review required
- 📊 Weekly summaries

### Weekly Reports
Automated emails every Monday with:
- Total fixes and success rate
- Time and cost savings
- Error type breakdown
- Pattern learning progress
- Recommendations

## Best Practices

1. **Start Conservative**
   - Begin with high confidence thresholds (85%+)
   - Enable auto-fix only for safe error types
   - Monitor closely for the first week

2. **Review Patterns Weekly**
   - Check `/patterns` endpoint
   - Disable poorly performing patterns
   - Adjust confidence thresholds

3. **Set Up Alerts**
   - Configure Slack for immediate notifications
   - Set email alerts for critical errors
   - Review weekly reports

4. **Monitor Performance**
   - Check dashboard regularly
   - Watch for error rate spikes
   - Review rollback events

## Troubleshooting

### Auto-fixer not starting
```bash
# Check logs
tail -f /tmp/auto_fixer.log

# Verify environment
python3 -c "import enhanced_auto_fixer"
```

### Patterns not learning
```bash
# Check database
sqlite3 auto_fixer.db "SELECT * FROM error_patterns;"
```

### Notifications not working
```bash
# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_SLACK_WEBHOOK_URL
```

## Security Considerations

1. **Webhook Verification:** Always enabled with HMAC-SHA256
2. **Rate Limiting:** Prevents abuse and cascading failures
3. **Approval Workflows:** High-risk changes require review
4. **Audit Trail:** All fixes logged with full details

## Support

- **Dashboard:** http://localhost:8003/docs
- **Logs:** `/tmp/auto_fixer.log`
- **Database:** `auto_fixer.db`
- **Config:** `auto_fixer_config.yaml`
