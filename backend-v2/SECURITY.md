# Security Guidelines for BookedBarber V2

## 🛡️ Critical Security Issues Found

### 1. **CRITICAL: Exposed .env Files in Git**
The following files are tracked in version control and contain sensitive credentials:
- `.env.production` - Contains hardcoded SECRET_KEY and JWT_SECRET_KEY
- `backend-v2/.env.production`
- `backend-v2/.env.staging`

**Immediate Action Required:**
```bash
# Remove these files from git immediately
git rm --cached .env.production
git rm --cached backend-v2/.env.production
git rm --cached backend-v2/.env.staging
git commit -m "security: remove exposed .env files from version control"

# Add to .gitignore if not already present
echo ".env.production" >> .gitignore
echo ".env.staging" >> .gitignore
```

### 2. **HIGH: Hardcoded Test Credentials**
Multiple test files contain hardcoded passwords and credentials:
- `test_auth_direct.py` - Contains hardcoded SECRET_KEY and test passwords
- Various test files with embedded credentials

**Recommendation:** Move all test credentials to environment variables or use mock values.

## 🔐 Security Best Practices

### Environment Variables

1. **Never Commit Secrets**
   - Use `.env.template` or `.env.example` files with dummy values
   - Keep actual `.env` files in `.gitignore`
   - Use environment-specific files: `.env.development`, `.env.production`

2. **Secure Key Generation**
   ```python
   # Generate secure keys
   import secrets
   
   # For SECRET_KEY and JWT_SECRET_KEY
   print(secrets.token_urlsafe(64))
   
   # For API keys
   print(f"sk_{secrets.token_urlsafe(32)}")
   ```

3. **Key Rotation Schedule**
   - Production keys: Rotate every 90 days
   - Staging keys: Rotate every 180 days
   - Development keys: Rotate annually

### Password Security

1. **Password Requirements**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

2. **Password Hashing**
   - Use bcrypt with cost factor 12 or higher
   - Never store plain text passwords
   - Salt all passwords

### API Security

1. **Rate Limiting**
   - Authentication endpoints: 5 attempts per minute
   - API endpoints: 60 requests per minute per user
   - Payment endpoints: 10 requests per minute

2. **Input Validation**
   - Validate all input data
   - Use parameterized queries
   - Sanitize user input
   - Implement CSRF protection

3. **Authentication**
   - Use JWT tokens with short expiration times
   - Implement refresh token rotation
   - Enable MFA for admin accounts
   - Log all authentication attempts

### Database Security

1. **Connection Security**
   - Use SSL/TLS for database connections
   - Implement connection pooling
   - Use least privilege principle for database users

2. **Data Protection**
   - Encrypt sensitive data at rest
   - Implement database backups
   - Regular security audits

### Third-Party Services

1. **API Key Management**
   - Use separate keys for each environment
   - Implement key rotation
   - Monitor key usage
   - Enable IP restrictions where possible

2. **Service-Specific Security**
   - **Stripe**: Use webhook signatures, implement idempotency
   - **SendGrid**: Domain authentication, dedicated IPs for production
   - **Twilio**: Implement rate limiting, validate phone numbers
   - **Google APIs**: Use OAuth2, implement proper scopes

### Monitoring & Incident Response

1. **Security Monitoring**
   - Log all authentication attempts
   - Monitor for unusual patterns
   - Set up alerts for failed login attempts
   - Track API usage patterns

2. **Incident Response Plan**
   - Immediate key rotation if breach suspected
   - Notify affected users within 72 hours
   - Document all security incidents
   - Regular security drills

### Development Security

1. **Code Review Requirements**
   - All PRs must be reviewed for security issues
   - No hardcoded credentials
   - Proper input validation
   - Secure error handling

2. **Testing Security**
   - Use environment variables for test credentials
   - Implement security-focused tests
   - Regular penetration testing
   - Dependency vulnerability scanning

### Deployment Security

1. **Production Checklist**
   - [ ] All environment variables configured
   - [ ] SSL/TLS certificates installed
   - [ ] Security headers configured
   - [ ] Rate limiting enabled
   - [ ] Monitoring configured
   - [ ] Backup strategy implemented
   - [ ] Incident response plan documented

2. **Infrastructure Security**
   - Use firewalls to restrict access
   - Implement DDoS protection
   - Regular security updates
   - Automated vulnerability scanning

## 🚨 Security Vulnerability Reporting

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security@bookedbarber.com with details
3. Include steps to reproduce
4. Allow 48 hours for initial response

## 📋 Security Checklist for Developers

Before committing code:
- [ ] No hardcoded credentials
- [ ] No sensitive data in logs
- [ ] Input validation implemented
- [ ] Error messages don't leak information
- [ ] Dependencies are up to date
- [ ] Security tests pass

Before deploying:
- [ ] Environment variables configured
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] Monitoring enabled
- [ ] Backup tested
- [ ] Security scan completed

## 🔄 Regular Security Tasks

### Daily
- Monitor authentication logs
- Check for unusual API usage
- Review error logs

### Weekly
- Review security alerts
- Update dependencies
- Check for exposed credentials

### Monthly
- Security audit
- Penetration testing
- Key rotation review
- Access control audit

### Quarterly
- Full security assessment
- Incident response drill
- Policy review
- Training update

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Security Headers](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Have I Been Pwned](https://haveibeenpwned.com/)

---

Last Updated: 2025-07-03
Security Contact: security@bookedbarber.com