# Security Hardening Guide for 6FB Booking Platform

This guide provides comprehensive security hardening steps for your production deployment.

## 🔒 Security Checklist Overview

- [ ] Environment & Secrets Management
- [ ] Authentication & Authorization
- [ ] API Security
- [ ] Database Security
- [ ] Infrastructure Security
- [ ] Monitoring & Incident Response
- [ ] Compliance & Data Protection

## 1. Environment & Secrets Management 🔐

### Immediate Actions

1. **Generate Strong Secret Keys**:
   ```bash
   # Generate new SECRET_KEY
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
   Update in Render: `SECRET_KEY=<new-key>`

2. **Rotate All API Keys**:
   - [ ] Stripe API keys
   - [ ] SendGrid API key
   - [ ] Twilio credentials
   - [ ] Google OAuth credentials

3. **Environment Variable Security**:
   ```bash
   # Never commit .env files
   echo ".env*" >> .gitignore

   # Use separate keys for dev/staging/prod
   PROD_STRIPE_KEY=sk_live_...
   DEV_STRIPE_KEY=sk_test_...
   ```

### Best Practices

- Use Render's encrypted environment variables
- Implement key rotation schedule (every 90 days)
- Document key purposes but never values
- Use least privilege principle for API keys

## 2. Authentication & Authorization 🛡️

### Password Policies

1. **Enforce Strong Passwords**:
   ```python
   # In backend-v2/utils/security.py
   PASSWORD_REQUIREMENTS = {
       "min_length": 12,
       "require_uppercase": True,
       "require_lowercase": True,
       "require_numbers": True,
       "require_special": True,
       "prevent_common": True
   }
   ```

2. **Implement Account Lockout**:
   ```python
   # After 5 failed attempts
   MAX_LOGIN_ATTEMPTS = 5
   LOCKOUT_DURATION = 30  # minutes
   ```

3. **Session Management**:
   ```python
   # In settings
   ACCESS_TOKEN_EXPIRE_MINUTES = 30
   REFRESH_TOKEN_EXPIRE_DAYS = 7
   SESSION_COOKIE_SECURE = True
   SESSION_COOKIE_HTTPONLY = True
   SESSION_COOKIE_SAMESITE = "Strict"
   ```

### Multi-Factor Authentication (MFA)

1. **Enable for Admin Accounts**:
   ```python
   # Require MFA for roles: super_admin, admin
   MFA_REQUIRED_ROLES = ["super_admin", "admin"]
   ```

2. **TOTP Implementation**:
   - Use PyOTP for TOTP generation
   - Provide QR codes for authenticator apps
   - Backup codes for recovery

## 3. API Security 🌐

### Rate Limiting

1. **Configure in Render**:
   ```bash
   RATE_LIMIT_PER_MINUTE=60
   RATE_LIMIT_PER_HOUR=600
   RATE_LIMIT_PER_DAY=5000
   ```

2. **Endpoint-Specific Limits**:
   ```python
   # Stricter limits for sensitive endpoints
   "/api/v1/auth/login": "5 per minute"
   "/api/v1/auth/register": "3 per minute"
   "/api/v1/payments": "10 per minute"
   ```

### CORS Configuration

```python
# In backend-v2/main.py - Production only
ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",
    "https://www.your-frontend-domain.com"
]

# Never use wildcards in production
# BAD: ALLOWED_ORIGINS = ["*"]
```

### API Key Authentication

For webhook endpoints:
```python
# Webhook security
WEBHOOK_SECRETS = {
    "stripe": os.getenv("STRIPE_WEBHOOK_SECRET"),
    "sendgrid": os.getenv("SENDGRID_WEBHOOK_KEY")
}

def verify_webhook_signature(provider: str, signature: str, payload: bytes):
    # Implement signature verification
    pass
```

### Request Validation

1. **Input Sanitization**:
   ```python
   # Use Pydantic for automatic validation
   class BookingCreate(BaseModel):
       service_id: int
       barber_id: int
       appointment_date: date
       appointment_time: time
       client_email: EmailStr
       client_phone: constr(regex=r'^\+?1?\d{10,15}$')
   ```

2. **SQL Injection Prevention**:
   - ✅ Use SQLAlchemy ORM (already implemented)
   - ❌ Never use raw SQL with user input
   - ✅ Parameterized queries only

## 4. Database Security 🗄️

### Connection Security

1. **Enable SSL/TLS**:
   ```python
   # In DATABASE_URL
   postgresql://user:pass@host/db?sslmode=require
   ```

2. **Connection Pooling**:
   ```python
   # Limit connections
   SQLALCHEMY_POOL_SIZE = 10
   SQLALCHEMY_MAX_OVERFLOW = 20
   SQLALCHEMY_POOL_TIMEOUT = 30
   ```

### Access Control

1. **Database User Permissions**:
   ```sql
   -- Create application user with limited permissions
   CREATE USER app_user WITH PASSWORD 'strong_password';
   GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
   -- Don't grant DELETE on critical tables
   ```

2. **Backup Strategy**:
   - Daily automated backups
   - Test restore procedures monthly
   - Encrypt backups at rest

### Data Encryption

1. **Encrypt Sensitive Fields**:
   ```python
   # In models
   class Client(Base):
       # Encrypt PII
       phone = Column(EncryptedType(String, secret_key))
       email = Column(EncryptedType(String, secret_key))
   ```

2. **Encryption Keys**:
   ```bash
   # Separate from SECRET_KEY
   FIELD_ENCRYPTION_KEY=<base64-encoded-32-byte-key>
   ```

## 5. Infrastructure Security 🏗️

### Render-Specific Security

1. **Enable All Security Features**:
   - [ ] Force HTTPS redirects
   - [ ] Enable DDoS protection
   - [ ] Configure firewall rules
   - [ ] Enable automated security updates

2. **Network Security**:
   ```yaml
   # Only allow specific IPs for admin endpoints
   admin_whitelist:
     - "office_ip_1"
     - "office_ip_2"
   ```

### Security Headers

```python
# In middleware/security.py
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

### File Upload Security

If implementing file uploads:
```python
ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
UPLOAD_FOLDER = '/secure/uploads/'

def validate_file(file):
    # Check file type, size, scan for malware
    pass
```

## 6. Monitoring & Incident Response 📊

### Logging Configuration

1. **Security Event Logging**:
   ```python
   # Log these events
   SECURITY_EVENTS = [
       "failed_login",
       "password_reset",
       "permission_denied",
       "suspicious_activity",
       "data_export",
       "admin_action"
   ]
   ```

2. **Log Retention**:
   ```bash
   # Keep security logs for 90 days minimum
   LOG_RETENTION_DAYS=90
   ```

### Alerts Configuration

1. **Real-time Alerts for**:
   - Multiple failed login attempts
   - Unusual data access patterns
   - API rate limit violations
   - Database connection failures
   - Payment processing errors

2. **Sentry Configuration**:
   ```python
   sentry_sdk.init(
       dsn=SENTRY_DSN,
       environment="production",
       traces_sample_rate=0.1,
       profiles_sample_rate=0.1,
       before_send=filter_sensitive_data
   )
   ```

### Incident Response Plan

1. **Response Team**:
   - Primary: DevOps Lead
   - Secondary: Backend Lead
   - Escalation: CTO

2. **Response Procedures**:
   ```markdown
   1. Identify & Contain
   2. Assess Impact
   3. Eradicate Threat
   4. Recover Systems
   5. Document Lessons
   ```

## 7. Compliance & Data Protection 📋

### GDPR/Privacy Compliance

1. **Data Minimization**:
   - Only collect necessary data
   - Implement data retention policies
   - Provide data export/deletion

2. **Privacy Controls**:
   ```python
   # User rights implementation
   class PrivacyController:
       def export_user_data(user_id: int):
           # Export all user data
           pass

       def delete_user_data(user_id: int):
           # Anonymize or delete
           pass
   ```

### PCI Compliance (for payments)

1. **Never Store**:
   - ❌ Full credit card numbers
   - ❌ CVV codes
   - ❌ Magnetic stripe data

2. **Use Stripe's PCI Compliance**:
   - ✅ Tokenization for all card data
   - ✅ Stripe Elements for frontend
   - ✅ Webhook signature verification

## 8. Security Testing 🧪

### Regular Security Audits

1. **Automated Scanning**:
   ```bash
   # Python dependency scanning
   pip install safety
   safety check

   # JavaScript dependency scanning
   npm audit
   ```

2. **Penetration Testing**:
   - Schedule quarterly pen tests
   - Test OWASP Top 10 vulnerabilities
   - Document and fix findings

### Security Checklist for Deployments

```markdown
## Pre-Deployment Security Check
- [ ] All dependencies updated
- [ ] Security patches applied
- [ ] Environment variables verified
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] SSL certificates valid
- [ ] Backups tested
- [ ] Monitoring active
```

## 9. Quick Security Wins 🎯

### Do These Today:

1. **Change all default passwords**
2. **Enable 2FA for admin accounts**
3. **Set up Sentry error tracking**
4. **Configure rate limiting**
5. **Review and restrict CORS**
6. **Enable HTTPS everywhere**
7. **Set secure cookie flags**
8. **Implement audit logging**

### Security Resources

- [OWASP Security Guidelines](https://owasp.org)
- [Render Security Best Practices](https://render.com/docs/security)
- [FastAPI Security Guide](https://fastapi.tiangolo.com/tutorial/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

## 10. Emergency Contacts 🚨

```yaml
Security Incidents:
  Email: security@your-company.com
  Phone: +1-XXX-XXX-XXXX

Service Providers:
  Render Support: support@render.com
  Stripe Security: security@stripe.com

Internal:
  DevOps Lead: name@company.com
  CTO: cto@company.com
```

---

**Remember**: Security is an ongoing process, not a one-time setup. Review and update these measures regularly.

**Last Updated**: [Current Date]
**Next Review**: [90 days from now]
