# 001. Single Authentication System

Date: 2025-06-28

## Status

Accepted

## Context

The project had multiple authentication implementations scattered across the codebase:
- JWT-based authentication in the main API
- Demo mode authentication bypasses
- Various auth helper functions with different approaches
- Inconsistent token validation across endpoints

This fragmentation led to:
- Security vulnerabilities through bypasses
- Maintenance overhead
- Confusing user experience
- Difficulty in debugging authentication issues

## Decision

We will use a single, JWT-based authentication system throughout the entire application:

1. **Single Auth Service**: All authentication logic is centralized in `backend/services/auth_service.py`
2. **Consistent Token Validation**: One validation mechanism in `backend/middleware/auth.py`
3. **No Demo Mode**: Demo/test users use the same auth flow with test credentials
4. **Unified Frontend Auth**: Single auth context and hooks in `frontend/src/lib/auth/`

## Consequences

### Positive
- Improved security with no bypasses
- Easier to maintain and debug
- Consistent user experience
- Clear authentication flow
- Better testability

### Negative
- Demo users need actual credentials
- Slightly more complex testing setup
- Migration effort for existing code

### Neutral
- All features require authentication
- No special cases for development

## References

- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- OAuth 2.0 Security Best Current Practice: https://tools.ietf.org/html/draft-ietf-oauth-security-topics