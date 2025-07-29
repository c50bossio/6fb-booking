# Environment Variable Security Guide

## 🔒 Critical Security Assessment

**URGENT**: The main backend-v2/.env file contains **LIVE PRODUCTION KEYS** including:
- Live Stripe API keys (sk_live_*, pk_live_*)
- Production OpenAI API keys
- Production Anthropic API keys
- Real OAuth client secrets
- Working Twilio credentials

**Immediate Actions Required:**
1. ✅ .env files are properly excluded from version control via .gitignore
2. ✅ Template files created with placeholder values
3. ⚠️  **CRITICAL**: Rotate all production API keys immediately in production
4. ⚠️  **CRITICAL**: Use different keys for development vs production

## Environment Security Status

### ✅ Secured Files
- **Git Status**: .env files are properly ignored by version control
- **Templates**: Secure template files created at:
  - `/Users/bossio/6fb-booking/backend-v2/.env.template`
  - `/Users/bossio/6fb-booking/.env.template`
  - Load testing and onboarding directories have templates

### 🚨 Files with Sensitive Data (Local Only)
- `/Users/bossio/6fb-booking/backend-v2/.env` - **Contains live production keys**
- `/Users/bossio/6fb-booking/.env` - Contains development configuration
- `/Users/bossio/6fb-booking/agent-evolution-system/.env` - Basic service config
- `/Users/bossio/6fb-booking/6fb-dashboard-onboarding/backend-v2/.env` - Development config
- `/Users/bossio/6fb-booking/6fb-barber-onboarding/backend-v2/.env` - Development config
- `/Users/bossio/6fb-booking/load-testing/.env` - Load testing config

## Security Infrastructure

### Existing Security Features
The codebase already includes comprehensive security infrastructure:

1. **Environment Validation**: `/Users/bossio/6fb-booking/backend-v2/utils/env_validator.py`
2. **Configuration Security**: `/Users/bossio/6fb-booking/backend-v2/middleware/configuration_security.py`
3. **Credential Validation**: `/Users/bossio/6fb-booking/backend-v2/security/credential_validator.py`
4. **Production Validation**: `/Users/bossio/6fb-booking/backend-v2/scripts/validate_environment.py`

### Validation Commands
```bash
# Validate current environment
cd /Users/bossio/6fb-booking/backend-v2
python utils/env_validator.py

# Validate production configuration
python scripts/validate_environment.py .env.production

# Security validation
python security/credential_validator.py
```

## Setup Instructions for New Developers

### 1. Environment Setup
```bash
# Navigate to project
cd /Users/bossio/6fb-booking/backend-v2

# Copy template to create your .env file
cp .env.template .env

# Edit .env with your actual values
nano .env
```

### 2. Required Variables by Priority

#### 🔴 Critical (Application won't start)
```bash
SECRET_KEY="generate-64-char-secure-key"
JWT_SECRET_KEY="generate-different-64-char-key"
DATABASE_URL="your-database-connection-string"
```

#### 🟠 Required for Features
```bash
# Payment processing
STRIPE_SECRET_KEY="sk_test_your-test-key"
STRIPE_PUBLISHABLE_KEY="pk_test_your-test-key"

# Communication services
SENDGRID_API_KEY="SG.your-api-key"
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
```

#### 🟡 Recommended
```bash
# Error tracking
SENTRY_DSN="your-sentry-dsn"

# OAuth integrations
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Key Generation
```bash
# Generate secure keys (run this multiple times for different keys)
python -c 'import secrets; print(secrets.token_urlsafe(64))'
```

## Security Best Practices

### ✅ Do's
- Use different keys for development, staging, and production
- Rotate credentials quarterly
- Use test/sandbox keys for development
- Store production keys in secure vault systems
- Validate environment on startup
- Monitor for credential exposure

### ❌ Don'ts
- Never commit .env files to version control
- Never use production keys in development
- Never share credentials via chat/email
- Never use default or weak secret keys
- Never disable environment validation

## Runtime Validation

The application includes automatic environment validation:

### Startup Validation
- Checks for required variables
- Validates key formats and strength
- Warns about insecure configurations
- Blocks startup if critical variables missing

### Health Check Endpoint
```bash
# Check environment health
curl http://localhost:8000/api/v2/health/environment
```

## Production Deployment Checklist

### Before Deployment
- [ ] Run `python scripts/validate_environment.py .env.production`
- [ ] Verify all keys are production-ready (no test keys)
- [ ] Confirm secret keys are cryptographically secure
- [ ] Test external service connections
- [ ] Verify CORS origins for your domains

### Security Headers
Production automatically enables:
- HTTPS enforcement
- Security headers (HSTS, CSP, etc.)
- Secure cookie settings
- Rate limiting
- Request validation

## Emergency Procedures

### If Credentials Are Compromised
1. **Immediately rotate** all affected API keys
2. **Revoke access** for compromised credentials
3. **Update environment variables** in all environments
4. **Monitor logs** for unauthorized access
5. **Audit recent activity** across all services

### Key Rotation Process
1. Generate new credentials from service providers
2. Update staging environment first
3. Test all functionality
4. Update production environment
5. Revoke old credentials
6. Monitor for any issues

## Monitoring and Alerts

### Log Monitoring
- Authentication failures
- Invalid API key usage
- Suspicious access patterns
- Configuration changes

### Recommended Alerts
- Failed startup due to missing variables
- Weak or default keys detected
- Multiple authentication failures
- Unusual API usage patterns

## Compliance Notes

This security configuration supports:
- **SOC 2 Type II** compliance requirements
- **GDPR** data protection standards
- **PCI DSS** payment security standards
- **HIPAA** healthcare privacy (if applicable)

## Support

For security questions or incident response:
1. Check the troubleshooting guide: `/docs/TROUBLESHOOTING.md`
2. Run validation scripts in `/scripts/`
3. Review security middleware in `/middleware/`
4. Contact security team for production issues

---

**Last Updated**: 2025-07-28
**Security Review**: Required quarterly
**Next Review Due**: 2025-10-28