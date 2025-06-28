# Technical Decisions Log - 6FB Booking

## June 19, 2025

### Import Structure Decision
**Decision**: Changed from `middleware.auth` to `utils.auth_decorators`
**Reason**: The auth module was incorrectly placed in utils directory, not middleware
**Impact**: Fixes server startup issues
**Alternative Considered**: Moving auth_decorators to middleware directory
**Why This Choice**: Less disruptive to existing codebase

### Sentry Integration
**Decision**: Use separate Sentry project for Python backend
**Reason**: Better error segregation and project-specific alerting
**Impact**: Clearer error tracking per service
**Configuration**:
- DSN: Python project (4509526819012608)
- Environment: development/production based on env var
- Sensitive data filtering enabled

## Security Decisions Needed

### Rate Limiting Strategy
**Options**:
1. Use slowapi (FastAPI rate limiting)
2. Implement Redis-based rate limiting
3. Use Cloudflare or nginx rate limiting

**Recommendation**: slowapi for application-level + nginx for infrastructure-level

### Authentication Security
**Current State**: Basic JWT implementation
**Needed**:
- Refresh token rotation
- Session invalidation
- Device fingerprinting
- 2FA support

### Webhook Security
**Current State**: Unknown signature verification
**Needed**:
- HMAC signature verification for Trafft webhooks
- Webhook replay attack prevention
- Request timestamp validation
