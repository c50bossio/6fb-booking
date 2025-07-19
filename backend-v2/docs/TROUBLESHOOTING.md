# BookedBarber V2 - Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide covers common issues, solutions, and debugging techniques for BookedBarber V2. The guide is organized by component and includes step-by-step resolution procedures.

## Quick Diagnostic Tools

### System Health Check
```bash
# Run comprehensive health check
cd backend-v2
python scripts/health_check_all.py

# Check specific components
curl http://localhost:8000/health  # Backend health
curl http://localhost:3000/        # Frontend health
```

### Environment Validation
```bash
# Validate environment configuration
cd backend-v2
python scripts/validate_environment.py

# Check all required environment variables
python -c "
import os
required_vars = ['DATABASE_URL', 'SECRET_KEY', 'STRIPE_SECRET_KEY']
for var in required_vars:
    if not os.getenv(var):
        print(f'❌ Missing: {var}')
    else:
        print(f'✅ Found: {var}')
"
```

## Backend Issues

### 1. Database Connection Problems

#### Issue: "could not connect to server"
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server: Connection refused
```

**Diagnosis:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test direct connection
psql postgresql://username:password@localhost:5432/database_name

# Check port availability
netstat -tlnp | grep 5432
```

**Solutions:**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Reset PostgreSQL if corrupted
sudo systemctl stop postgresql
sudo -u postgres /usr/lib/postgresql/14/bin/initdb -D /var/lib/postgresql/14/main
sudo systemctl start postgresql

# Check and fix permissions
sudo chown -R postgres:postgres /var/lib/postgresql/
sudo chmod 700 /var/lib/postgresql/14/main
```

#### Issue: "database does not exist"
```bash
# Create missing database
sudo -u postgres psql
CREATE DATABASE sixfb_booking;
CREATE USER sixfb_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sixfb_booking TO sixfb_user;
\q

# Run migrations
cd backend-v2
alembic upgrade head
```

#### Issue: Migration failures
```bash
# Check migration status
alembic current
alembic history

# Reset migrations (CAUTION: data loss)
alembic downgrade base
alembic upgrade head

# Fix conflicts in migrations
alembic merge -m "merge conflicting heads" head_1 head_2
alembic upgrade head
```

### 2. Authentication Issues

#### Issue: JWT Token errors
```
"detail": "Could not validate credentials"
```

**Diagnosis:**
```bash
# Check SECRET_KEY configuration
echo $SECRET_KEY | wc -c  # Should be 64+ characters

# Test token generation
python -c "
import jwt
from datetime import datetime, timedelta
secret = 'your_secret_key'
payload = {'user_id': 1, 'exp': datetime.utcnow() + timedelta(hours=1)}
token = jwt.encode(payload, secret, algorithm='HS256')
decoded = jwt.decode(token, secret, algorithms=['HS256'])
print('Token generation: OK')
"
```

**Solutions:**
```bash
# Generate new SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Update .env file
SECRET_KEY=new_generated_secret_key

# Restart backend server
pkill -f uvicorn
uvicorn main:app --reload
```

#### Issue: MFA Setup Problems
```bash
# Test TOTP generation
python -c "
import pyotp
secret = pyotp.random_base32()
totp = pyotp.TOTP(secret)
print(f'Secret: {secret}')
print(f'Current OTP: {totp.now()}')
"

# Verify MFA service
cd backend-v2
python -m pytest tests/test_mfa_service.py -v
```

### 3. API Rate Limiting Issues

#### Issue: "Rate limit exceeded"
```
{"detail": "Rate limit exceeded: 100 per 1 minute"}
```

**Diagnosis:**
```bash
# Check Redis connection (rate limiting backend)
redis-cli ping

# Check current rate limits
redis-cli KEYS "rate_limit:*"
redis-cli GET "rate_limit:user:123:endpoint:/api/v2/appointments"
```

**Solutions:**
```bash
# Clear rate limits for testing
redis-cli FLUSHDB

# Adjust rate limits in configuration
# Edit utils/rate_limit.py
RATE_LIMITS = {
    "default": "200/minute",
    "auth": "10/minute",
    "payment": "20/minute"
}

# Restart services
sudo systemctl restart 6fb-backend
```

### 4. Payment Integration Issues

#### Issue: Stripe webhook verification failures
```
"detail": "Invalid Stripe signature"
```

**Diagnosis:**
```bash
# Test webhook endpoint
curl -X POST http://localhost:8000/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type": "test.event"}'

# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET | head -c 10  # Should start with "whsec_"
```

**Solutions:**
```bash
# Test Stripe connection
stripe listen --forward-to localhost:8000/stripe/webhook

# Verify webhook configuration in Stripe dashboard
# Endpoint URL: https://your-domain.com/stripe/webhook
# Events: payment_intent.succeeded, payment_intent.payment_failed

# Update webhook secret
STRIPE_WEBHOOK_SECRET=whsec_new_webhook_secret_from_stripe
```

#### Issue: Stripe Connect onboarding failures
```bash
# Test Stripe Connect setup
python -c "
import stripe
stripe.api_key = 'sk_test_your_key'
try:
    account = stripe.Account.create(type='express')
    print(f'Test account created: {account.id}')
except Exception as e:
    print(f'Error: {e}')
"
```

### 5. Email/SMS Notification Issues

#### Issue: SendGrid email failures
```bash
# Test SendGrid connection
python -c "
import sendgrid
from sendgrid.helpers.mail import Mail
sg = sendgrid.SendGridAPIClient(api_key='your_api_key')
message = Mail(
    from_email='test@yourdomain.com',
    to_emails='test@example.com',
    subject='Test',
    html_content='Test email'
)
try:
    response = sg.send(message)
    print(f'Email sent: {response.status_code}')
except Exception as e:
    print(f'Error: {e}')
"

# Check SendGrid API key and domain verification
# Verify sender email is authenticated in SendGrid
```

#### Issue: Twilio SMS failures
```bash
# Test Twilio connection
python -c "
from twilio.rest import Client
client = Client('account_sid', 'auth_token')
try:
    message = client.messages.create(
        body='Test message',
        from_='+1234567890',
        to='+0987654321'
    )
    print(f'SMS sent: {message.sid}')
except Exception as e:
    print(f'Error: {e}')
"
```

### 6. AI Analytics Issues

#### Issue: Cross-user analytics not working
```bash
# Check consent status
python -c "
from database import get_db
from models.consent import UserConsent, ConsentType
db = next(get_db())
consents = db.query(UserConsent).filter(
    UserConsent.consent_type == ConsentType.AGGREGATE_ANALYTICS
).count()
print(f'Users with analytics consent: {consents}')
"

# Test AI analytics service
cd backend-v2
python -m pytest tests/test_ai_analytics_comprehensive.py -v
```

#### Issue: Prediction model failures
```bash
# Check model data requirements
python scripts/check_ai_data_requirements.py

# Validate anonymization service
python -c "
from services.privacy_anonymization_service import PrivacyAnonymizationService
service = PrivacyAnonymizationService()
test_data = {'revenue': 1000, 'user_id': 123}
anonymized = service.anonymize_user_data(test_data)
print(f'Anonymization working: {\"user_id\" not in anonymized}')
"
```

## Frontend Issues

### 1. Build and Development Issues

#### Issue: TypeScript compilation errors
```bash
# Check TypeScript configuration
cd backend-v2/frontend-v2
npx tsc --noEmit

# Fix common TypeScript issues
npm run lint:fix

# Clear TypeScript cache
rm -rf .next/
rm -rf node_modules/.cache/
npm run build
```

#### Issue: "Module not found" errors
```bash
# Verify imports and path mappings
cat tsconfig.json | grep -A 10 "paths"

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for missing dependencies
npm ls --depth=0
```

#### Issue: Build memory issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or add to package.json scripts:
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

### 2. Runtime Issues

#### Issue: API connection failures
```bash
# Test API connectivity
curl -I http://localhost:8000/health

# Check CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8000/api/v2/users/me
```

#### Issue: Authentication state issues
```bash
# Clear browser storage
# In browser console:
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

#### Issue: React hydration errors
```bash
# Check for server/client mismatch
# Enable React strict mode in next.config.js:
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    strictNextHead: true,
  }
}
```

### 3. Performance Issues

#### Issue: Slow page loads
```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check for unnecessary re-renders
# Add to components:
import { memo, useMemo, useCallback } from 'react';

# Optimize images
# Use Next.js Image component:
import Image from 'next/image';
```

#### Issue: Memory leaks
```bash
# Check for memory leaks in useEffect
useEffect(() => {
    const subscription = something.subscribe();
    return () => subscription.unsubscribe(); // Cleanup
}, []);

# Profile memory usage in browser dev tools
# Memory tab -> Take heap snapshot
```

## Integration Issues

### 1. Google Calendar Integration

#### Issue: OAuth callback failures
```bash
# Verify OAuth configuration
echo "Client ID: $GOOGLE_CLIENT_ID"
echo "Redirect URI: $GOOGLE_REDIRECT_URI"

# Test OAuth flow
python -c "
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

flow = Flow.from_client_config(
    client_config, scopes=['https://www.googleapis.com/auth/calendar']
)
flow.redirect_uri = 'http://localhost:8000/api/calendar/callback'
auth_url, _ = flow.authorization_url(prompt='consent')
print(f'Auth URL: {auth_url}')
"
```

#### Issue: Calendar sync failures
```bash
# Test Calendar API access
python -c "
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

# Use stored credentials
creds = Credentials.from_authorized_user_info(info)
service = build('calendar', 'v3', credentials=creds)
calendars = service.calendarList().list().execute()
print(f'Calendars found: {len(calendars.get(\"items\", []))}')
"

# Check API quotas
# Google Cloud Console -> APIs & Services -> Quotas
```

### 2. Google My Business Integration

#### Issue: GMB API access denied
```bash
# Check GMB API status
curl -H "Authorization: Bearer $GMB_ACCESS_TOKEN" \
     "https://mybusinessbusinessinformation.googleapis.com/v1/accounts"

# Verify business verification status
# Business must be verified in Google My Business
```

#### Issue: Review sync failures
```bash
# Test review fetching
python -c "
from services.gmb_service import GMBService
service = GMBService()
reviews = service.fetch_recent_reviews(location_id='your_location_id')
print(f'Reviews fetched: {len(reviews)}')
"
```

### 3. Meta Pixel Integration

#### Issue: Pixel events not tracking
```bash
# Test pixel configuration
# In browser console:
fbq('track', 'PageView');
console.log(fbq.queue); // Should show queued events

# Check pixel helper browser extension
# Meta Pixel Helper Chrome extension
```

## Testing Issues

### 1. Backend Test Failures

#### Issue: Database test isolation
```bash
# Use test database
export DATABASE_URL="sqlite:///test.db"

# Or PostgreSQL test database
export DATABASE_URL="postgresql://test_user:test_pass@localhost:5432/test_db"

# Run tests with cleanup
cd backend-v2
python -m pytest --tb=short -v
```

#### Issue: Async test issues
```bash
# Fix async test configuration
# In conftest.py:
import pytest
import asyncio

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
```

### 2. Frontend Test Failures

#### Issue: Jest configuration issues
```bash
# Update jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
}
```

#### Issue: Component testing failures
```bash
# Fix React Testing Library issues
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Update test setup
// jest.setup.js
import '@testing-library/jest-dom';
```

## Performance Issues

### 1. Database Performance

#### Issue: Slow queries
```bash
# Enable query logging
# In postgresql.conf:
log_statement = 'all'
log_min_duration_statement = 1000  # Log queries > 1 second

# Analyze slow queries
sudo tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"

# Add missing indexes
# Run database performance analysis
cd backend-v2
python scripts/analyze_database_performance.py
```

#### Issue: Connection pool exhaustion
```bash
# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Adjust connection pool settings
# In database.py:
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_recycle=3600
)
```

### 2. Application Performance

#### Issue: High memory usage
```bash
# Monitor memory usage
htop
ps aux | grep python | grep uvicorn

# Check for memory leaks
cd backend-v2
python -m pytest tests/performance/ --memray

# Profile memory usage
python -m memory_profiler main.py
```

#### Issue: High CPU usage
```bash
# Profile CPU usage
python -m cProfile -o profile.stats main.py
python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative').print_stats(10)
"
```

## Security Issues

### 1. HTTPS/SSL Issues

#### Issue: SSL certificate problems
```bash
# Check certificate validity
openssl x509 -in /path/to/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443

# Verify certificate chain
curl -I https://yourdomain.com
```

#### Issue: CORS configuration
```bash
# Check CORS headers
curl -H "Origin: https://yourdomain.com" \
     -I https://api.yourdomain.com/health

# Update CORS settings in main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### 2. GDPR Compliance Issues

#### Issue: Data export failures
```bash
# Test data export service
python -c "
from services.export_service import ExportService
service = ExportService()
export_id = service.create_export_request(user_id=1)
print(f'Export created: {export_id}')
"

# Check export status
python scripts/check_export_status.py export_id
```

#### Issue: Cookie consent not working
```bash
# Test cookie consent API
curl -X POST http://localhost:8000/api/v2/privacy/cookies \
  -H "Content-Type: application/json" \
  -d '{"preferences": {"essential": "granted", "analytics": "denied"}}'
```

## Monitoring and Logging

### 1. Log Analysis

#### Check application logs
```bash
# Backend logs
tail -f logs/backend.log | grep ERROR

# Frontend logs (if using PM2)
pm2 logs frontend

# System logs
journalctl -u 6fb-backend -f
journalctl -u 6fb-frontend -f
```

#### Log level configuration
```bash
# Set log level in .env
LOG_LEVEL=DEBUG  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Test logging
python -c "
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug('Debug message')
logger.info('Info message')
logger.error('Error message')
"
```

### 2. Health Monitoring

#### Automated health checks
```bash
#!/bin/bash
# health-monitor.sh
BACKEND_URL="http://localhost:8000/health"
FRONTEND_URL="http://localhost:3000"

# Check backend
if ! curl -f -s "$BACKEND_URL" > /dev/null; then
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
if ! curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "✅ All services healthy"
```

#### Performance monitoring
```bash
# Install monitoring tools
npm install -g clinic
pip install memory_profiler

# Profile backend performance
clinic doctor -- uvicorn main:app --host 0.0.0.0 --port 8000

# Profile frontend performance
clinic doctor -- npm start
```

## Emergency Recovery Procedures

### 1. Service Recovery

#### Complete system restart
```bash
# Stop all services
sudo systemctl stop 6fb-backend 6fb-frontend nginx redis postgresql

# Start in correct order
sudo systemctl start postgresql redis
sleep 5
sudo systemctl start 6fb-backend
sleep 10
sudo systemctl start 6fb-frontend nginx

# Verify all services
systemctl status postgresql redis 6fb-backend 6fb-frontend nginx
```

#### Database recovery
```bash
# Restore from backup
sudo systemctl stop 6fb-backend
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sixfb_booking;"
sudo -u postgres psql -c "CREATE DATABASE sixfb_booking;"
sudo -u postgres psql sixfb_booking < /backup/latest.sql
sudo systemctl start 6fb-backend
```

### 2. Data Recovery

#### Recover from git
```bash
# Create recovery branch
git checkout -b emergency-recovery-$(date +%Y%m%d-%H%M%S)

# Reset to last known good state
git log --oneline -10  # Find good commit
git reset --hard GOOD_COMMIT_HASH

# Deploy recovery
git push origin emergency-recovery-branch
```

## Getting Additional Help

### 1. Diagnostic Information

When seeking help, include:

```bash
# System information
cat /etc/os-release
python --version
node --version
npm --version

# Application information
cd backend-v2
pip list | grep -E "(fastapi|sqlalchemy|stripe)"
cd frontend-v2
npm list --depth=0 | grep -E "(next|react|stripe)"

# Environment status
systemctl status 6fb-backend 6fb-frontend
df -h
free -h
```

### 2. Log Collection

```bash
# Collect relevant logs
mkdir debug-logs-$(date +%Y%m%d-%H%M%S)
cp /var/log/6fb-backend.log debug-logs/
cp /var/log/6fb-frontend.log debug-logs/
journalctl -u 6fb-backend --since "1 hour ago" > debug-logs/systemd-backend.log
journalctl -u 6fb-frontend --since "1 hour ago" > debug-logs/systemd-frontend.log
tar -czf debug-logs.tar.gz debug-logs/
```

### 3. Support Channels

- **Documentation**: Review all documentation in `/docs/` directory
- **GitHub Issues**: Search existing issues for similar problems
- **Discord Community**: Real-time support from community
- **Email Support**: Include debug logs and system information

### 4. Common Support Information

When contacting support, include:
- Detailed error messages (full stack traces)
- Steps to reproduce the issue
- Environment information (OS, versions, configuration)
- Recent changes or deployments
- Relevant log excerpts
- Screenshots for UI issues

---

*Last Updated: 2025-07-03*
*Version: 2.0.0*
*Support: support@bookedbarber.com*