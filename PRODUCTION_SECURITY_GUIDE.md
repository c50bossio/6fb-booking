# 6FB Booking Platform - Production Security Deployment Guide

**Version**: 1.0  
**Date**: 2025-06-23  
**Environment**: Production Security Hardening  

## 🎯 Overview

This guide provides step-by-step instructions for deploying the 6FB Booking Platform with enterprise-grade security in production environments.

---

## 🔧 1. Environment Configuration

### Required Environment Variables

Create a production `.env` file with the following secure configurations:

```bash
# === SECURITY CONFIGURATION ===
ENVIRONMENT=production
SECRET_KEY=<64-char-cryptographically-secure-key>
JWT_SECRET_KEY=<64-char-cryptographically-secure-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# === SECURITY HEADERS & POLICIES ===
SECURITY_HEADERS_STRICT=true
CSP_REPORT_URI=https://your-domain.com/api/v1/security/csp-report
CORS_STRICT_MODE=true
RATE_LIMIT_STRICT_MODE=true

# === CORS CONFIGURATION ===
CORS_ALLOWED_ORIGINS=https://app.bookbarber.com,https://bookbarber.com
FRONTEND_URL=https://app.bookbarber.com

# === DATABASE ===
DATABASE_URL=postgresql://username:password@host:5432/dbname

# === STRIPE (PRODUCTION) ===
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# === EMAIL SERVICE ===
SENDGRID_API_KEY=SG.your-production-api-key
FROM_EMAIL=noreply@bookbarber.com
EMAIL_FROM_NAME="6FB Platform"

# === MONITORING & LOGGING ===
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
LOG_LEVEL=INFO
SANITIZE_LOGS=true
LOG_RETENTION_DAYS=90

# === SECURITY MONITORING ===
SECURITY_WEBHOOK_URL=https://hooks.slack.com/your-webhook
ALERT_THRESHOLD_FAILED_LOGINS=10
ALERT_THRESHOLD_RATE_LIMIT_HITS=100
```

### Generate Secure Keys

```bash
# Generate SECRET_KEY
python3 -c 'import secrets; print("SECRET_KEY=" + secrets.token_urlsafe(64))'

# Generate JWT_SECRET_KEY  
python3 -c 'import secrets; print("JWT_SECRET_KEY=" + secrets.token_urlsafe(64))'
```

---

## 🛡️ 2. Security Middleware Configuration

The platform includes several security middleware components that are automatically configured based on environment variables:

### Advanced Security Middleware
- Real-time threat detection
- SQL injection prevention
- XSS attack prevention
- Path traversal protection
- Suspicious user agent detection

### Security Headers Middleware
- Content Security Policy (CSP)
- HSTS headers
- XSS protection
- Content-type protection
- Frame options

### Rate Limiting Middleware
- Endpoint-specific rate limits
- IP-based rate limiting
- Automatic threat response

---

## 🚨 3. Security Monitoring Setup

### Sentry Configuration

1. Create a Sentry project at https://sentry.io
2. Copy the DSN to `SENTRY_DSN` environment variable
3. Configure alert rules in Sentry dashboard

### Security Monitoring Dashboard

Access the security dashboard at:
```
https://your-domain.com/api/v1/security/dashboard
```

### Real-time Alerts

Configure Slack/webhook alerts:
```bash
# Set webhook URL for security alerts
SECURITY_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

---

## 🔐 4. Authentication Security

### JWT Configuration

- Tokens expire in 1 hour (production setting)
- Secure secret keys enforced
- Token sanitization in logs
- No token blacklisting (stateless design)

### Password Security

- Minimum 8 characters
- Requires uppercase, lowercase, number, special character
- bcrypt hashing with salt rounds
- Rate limiting on login attempts (5 attempts per 5 minutes)

### Multi-Factor Authentication (Future Enhancement)

```python
# Placeholder for MFA implementation
# Recommended: TOTP (Time-based One-Time Password)
```

---

## 💳 5. Payment Security (PCI DSS Compliance)

### Stripe Integration

✅ **Current Security Measures**:
- Webhook signature verification enforced
- Payment data sanitization in logs
- Amount validation against appointment costs
- Fraud detection with maximum limits ($1000)
- No sensitive payment data stored

### PCI DSS Compliance Checklist

- [ ] Network security requirements met
- [x] Stripe handles card data processing
- [x] Secure data transmission (HTTPS only)
- [x] Access controls implemented
- [x] Security monitoring active
- [x] Regular security testing performed

---

## 🌐 6. Network Security

### HTTPS Configuration

**Required**: All production traffic must use HTTPS

### Firewall Rules

**Recommended firewall configuration**:

```bash
# Allow only necessary ports
# Port 443: HTTPS
# Port 22: SSH (restrict to admin IPs)
# Port 5432: PostgreSQL (internal only)

# Example iptables rules
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -s ADMIN_IP -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -s DB_SERVER_IP -j ACCEPT
iptables -A INPUT -j DROP  # Default deny
```

### CDN Configuration (Cloudflare)

```bash
# Enable security features:
# - DDoS protection
# - Web Application Firewall (WAF)
# - Rate limiting
# - SSL/TLS encryption
# - Bot management
```

---

## 📊 7. Database Security

### PostgreSQL Security

```sql
-- Create application user with limited permissions
CREATE USER sixfb_app WITH PASSWORD 'secure_random_password';
GRANT CONNECT ON DATABASE sixfb_production TO sixfb_app;
GRANT USAGE ON SCHEMA public TO sixfb_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sixfb_app;

-- Enable SSL
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

### Database Connection Security

```bash
# Use SSL connection string
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

---

## 🔍 8. Security Monitoring & Incident Response

### Automated Security Monitoring

The platform includes:
- Real-time threat detection
- Suspicious IP tracking
- Attack pattern recognition
- Automatic threat response
- Security event logging

### Manual Security Checks

**Daily**:
- Review security dashboard
- Check failed login attempts
- Monitor rate limit violations

**Weekly**:
- Review security event logs
- Analyze threat intelligence
- Update security configurations

**Monthly**:
- Security audit
- Penetration testing
- Update dependencies

### Incident Response Plan

**Severity Levels**:

1. **CRITICAL** - Immediate response required
   - Data breach suspected
   - System compromise detected
   - Payment fraud detected

2. **HIGH** - Response within 1 hour
   - Multiple failed admin logins
   - SQL injection attempts
   - Unusual traffic patterns

3. **MEDIUM** - Response within 4 hours
   - Rate limit violations
   - Suspicious user agents
   - Minor security events

4. **LOW** - Daily review
   - Normal security events
   - Routine monitoring alerts

---

## 🚀 9. Deployment Checklist

### Pre-Deployment Security Audit

- [ ] All environment variables configured with secure values
- [ ] SSL/TLS certificates installed and valid
- [ ] Database connections secured
- [ ] Firewall rules configured
- [ ] Security monitoring enabled
- [ ] Logging configured and tested
- [ ] Backup procedures tested
- [ ] Incident response plan documented

### Post-Deployment Verification

```bash
# Test security headers
curl -I https://your-domain.com/api/v1/health

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Content-Security-Policy: [policy string]

# Test rate limiting
for i in {1..20}; do curl https://your-domain.com/api/v1/health; done

# Test authentication
curl -X POST https://your-domain.com/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test&password=test"

# Should return 401 for invalid credentials
```

### Security Testing

```bash
# SQL injection test (should be blocked)
curl "https://your-domain.com/api/v1/users?search='; DROP TABLE users; --"

# XSS test (should be blocked)
curl "https://your-domain.com/api/v1/search?q=<script>alert('xss')</script>"

# Path traversal test (should be blocked)
curl "https://your-domain.com/api/v1/../../../etc/passwd"
```

---

## 📋 10. Compliance & Auditing

### Security Standards Compliance

- **PCI DSS**: Payment card data security
- **GDPR**: Data protection (if handling EU data)
- **SOC 2**: Security controls audit
- **NIST Framework**: Cybersecurity framework

### Audit Logging

All security events are logged with:
- Timestamp
- Event type
- IP address
- User ID (if applicable)
- Risk score
- Response taken

### Regular Security Reviews

**Quarterly**:
- Security policy review
- Access control audit
- Vulnerability scanning
- Penetration testing

**Annually**:
- Full security audit
- Compliance assessment
- Security training update
- Incident response drill

---

## 🆘 11. Emergency Procedures

### Security Breach Response

1. **Immediate Actions** (< 15 minutes):
   ```bash
   # Enable maintenance mode
   # Block suspicious IPs
   # Notify security team
   ```

2. **Assessment** (< 1 hour):
   - Determine scope of breach
   - Identify affected systems
   - Collect evidence

3. **Containment** (< 4 hours):
   - Isolate affected systems
   - Revoke compromised credentials
   - Apply security patches

4. **Recovery** (< 24 hours):
   - Restore from clean backups
   - Verify system integrity
   - Resume normal operations

5. **Post-Incident** (< 72 hours):
   - Complete forensic analysis
   - Update security measures
   - Notify stakeholders/authorities

### Emergency Contacts

```bash
# Security Team
SECURITY_EMAIL=security@6fb.com
SECURITY_PHONE=+1-XXX-XXX-XXXX

# Infrastructure Team  
OPS_EMAIL=ops@6fb.com
OPS_PHONE=+1-XXX-XXX-XXXX

# Management
MANAGEMENT_EMAIL=management@6fb.com
```

---

## 📞 12. Support & Maintenance

### Security Updates

**Monthly**: Security patch review and application
**Quarterly**: Security configuration review
**Annually**: Full security audit and penetration testing

### Monitoring Endpoints

```bash
# Security health check
GET /api/v1/security/health

# Security dashboard (admin only)
GET /api/v1/security/dashboard

# Threat intelligence (admin only)
GET /api/v1/security/threat-intelligence
```

### Documentation Updates

This guide should be updated whenever:
- Security configurations change
- New threats are identified
- Compliance requirements change
- Security tools are updated

---

**Last Updated**: 2025-06-23  
**Next Review**: 2025-09-23  
**Document Owner**: Security Team  
**Approval**: CTO/CISO  

*This document contains sensitive security information and should only be shared with authorized personnel.*