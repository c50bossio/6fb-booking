# Incident Response Playbook - 6FB Booking

## Overview
This document outlines the incident response procedures for the 6FB Booking application. It provides step-by-step guidance for identifying, responding to, and resolving security incidents.

## Incident Classification

### Severity Levels

**P0 - Critical**
- Database compromise or exposure
- User data breach
- Complete system compromise
- Production booking system down

**P1 - High**
- Unauthorized access to user data
- Authentication bypass
- Payment system issues
- Rate limiting being bypassed

**P2 - Medium**
- Non-critical API vulnerabilities
- Performance degradation
- Configuration security issues
- Booking data inconsistencies

**P3 - Low**
- Security best practice violations
- Minor configuration issues
- Documentation updates needed

## Response Procedures

### Immediate Response (First 15 minutes)

1. **Assess the Situation**
   - Determine incident severity level
   - Identify affected systems and data
   - Check if booking system is operational

2. **Contain the Threat**
   - **For data breach**: Isolate affected database/API
   - **For unauthorized access**: Revoke JWT tokens
   - **For DDoS**: Verify rate limiting is active
   - **For system compromise**: Isolate affected services

3. **Notify Stakeholders**
   - P0/P1: Immediate notification required
   - P2/P3: Can wait for business hours

### Investigation Phase (Next 30 minutes)

1. **Gather Evidence**
   - Check FastAPI logs via `uvicorn` output
   - Review rate limiting logs in `utils/security.py`
   - Examine authentication logs
   - Check database access patterns

2. **Document Timeline**
   - When did the incident start?
   - What triggered the discovery?
   - What actions have been taken?

3. **Assess Impact**
   - How many users affected?
   - What booking data was accessed?
   - Are payment details secure?

### Response Actions by Incident Type

#### Database Compromise

**Immediate Actions:**
1. Stop database connections:
   ```bash
   # Stop the FastAPI application
   pkill -f "uvicorn.*main:app"
   ```

2. Check database integrity:
   ```bash
   # Connect to database and verify data
   # Check for unauthorized modifications
   ```

3. Review database access logs
4. Change all database credentials

**Investigation:**
1. Check SQL injection vectors
2. Review authentication middleware
3. Verify input validation

#### Authentication Bypass

**Immediate Actions:**
1. Check JWT token validation in `utils/auth_decorators.py`
2. Revoke all active sessions by changing JWT secret
3. Force re-authentication for all users

**Investigation:**
1. Review authentication flow
2. Check for timing attacks
3. Verify token expiration handling

#### Rate Limiting Bypass

**Immediate Actions:**
1. Check rate limiter status:
   ```python
   # In utils/security.py - RateLimiter class
   # Verify rate limiting is active
   ```

2. Review rate limiting logs
3. Implement emergency rate limiting if needed

**Investigation:**
1. Check for IP spoofing
2. Review distributed attack patterns
3. Verify rate limiting headers

### 6FB Booking Specific Procedures

#### Booking System Protection

**Critical Endpoints to Monitor:**
- `/bookings` - Booking creation and retrieval
- `/auth/*` - Authentication endpoints
- `/sync-status` - Status synchronization
- `/dashboard/*` - Dashboard access

**Rate Limiting Configuration:**
```python
# Current limits in utils/security.py
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
```

**Health Check:**
```bash
# Check if system is responding
curl -I http://localhost:8000/health

# Verify rate limiting headers
curl -I http://localhost:8000/bookings
```

#### Data Protection

**Sensitive Data Types:**
- User authentication credentials
- Booking details and dates
- Personal information
- Session tokens

**Backup Procedures:**
1. Verify database backups are current
2. Test backup restoration process
3. Ensure backup encryption

### Recovery and Follow-up

#### Post-Incident Actions

1. **System Verification**
   - Test booking flow end-to-end
   - Verify authentication is working
   - Check rate limiting functionality

2. **Security Hardening**
   - Update security configurations
   - Implement additional monitoring
   - Review and update access controls

3. **Documentation**
   - Update security procedures
   - Document lessons learned
   - Schedule security reviews

## Monitoring and Detection

### Application Monitoring

**Performance Metrics:**
- Response times for booking endpoints
- Authentication success/failure rates
- Rate limiting violations

**Error Monitoring:**
- 500 errors in booking system
- Authentication failures
- Database connection issues

**Security Events:**
- Unusual access patterns
- Failed authentication attempts
- Rate limiting triggers

### Manual Checks

**Daily:**
- Check application logs
- Verify booking system functionality
- Review authentication logs

**Weekly:**
- Test rate limiting
- Review security configurations
- Check for new vulnerabilities

**Monthly:**
- Security audit
- Update dependencies
- Review access controls

## Emergency Commands

**Stop 6FB Booking:**
```bash
# Stop the FastAPI application
pkill -f "uvicorn.*main:app"

# Or if running in screen/tmux
screen -r booking_backend  # Then Ctrl+C
```

**Restart 6FB Booking:**
```bash
cd /Users/bossio/6fb-booking/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Check system status:**
```bash
# Check if running
ps aux | grep uvicorn

# Check port
lsof -i :8000

# Test connectivity
curl http://localhost:8000/health
```

**Quick security verification:**
```bash
# Test rate limiting
for i in {1..10}; do curl -I http://localhost:8000/health; done

# Check authentication
curl -I http://localhost:8000/bookings
```

## Contacts and Resources

### File Locations
- **Main application**: `/Users/bossio/6fb-booking/backend/main.py`
- **Security utilities**: `/Users/bossio/6fb-booking/backend/utils/security.py`
- **Authentication**: `/Users/bossio/6fb-booking/backend/utils/auth_decorators.py`

### Dependencies
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Custom rate limiting**: In-memory implementation

---
*Last updated: 2024-06-19*
*Next review due: 2024-09-19*
