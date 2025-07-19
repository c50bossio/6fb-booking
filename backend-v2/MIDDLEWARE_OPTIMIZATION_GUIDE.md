# Middleware Optimization Guide

## Problem
The heavy middleware stack was causing request deadlocks and backend hanging issues in development, making it difficult to test and debug the application.

## Solution: Environment-Based Middleware Configuration

### Middleware Analysis
The following middleware components were identified as heavy/problematic:

1. **RequestValidationMiddleware** - Comprehensive request validation with SQL injection checks
2. **MultiTenancyMiddleware** - Location-based access control
3. **FinancialSecurityMiddleware** - Velocity checks and Redis operations
4. **MFAEnforcementMiddleware** - Multi-factor authentication enforcement
5. **SentryEnhancementMiddleware** - Enhanced error reporting with JWT decoding

### Configuration Changes

#### Environment Variables
```bash
# Development mode settings
ENVIRONMENT=development
ENABLE_DEVELOPMENT_MODE=true  # Set to false to test full middleware stack in development
```

#### Middleware Loading Logic
```python
# Environment-based middleware configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ENABLE_DEVELOPMENT_MODE = os.getenv("ENABLE_DEVELOPMENT_MODE", "true").lower() == "true"

if ENVIRONMENT == "development" and ENABLE_DEVELOPMENT_MODE:
    # Lightweight middleware stack for development
    app.add_middleware(SecurityHeadersMiddleware)
else:
    # Full production middleware stack
    app.add_middleware(SentryEnhancementMiddleware, secret_key=secret_key)
    app.add_middleware(RequestValidationMiddleware)
    app.add_middleware(APIKeyValidationMiddleware, protected_paths={"/api/v2/webhooks", "/api/v2/internal"})
    app.add_middleware(MultiTenancyMiddleware)
    app.add_middleware(FinancialSecurityMiddleware)
    app.add_middleware(MFAEnforcementMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
```

## Usage

### Development Mode (Lightweight)
```bash
# Set environment variables
export ENVIRONMENT=development
export ENABLE_DEVELOPMENT_MODE=true

# Start server
python start_dev_lightweight.py
# or
uvicorn main:app --reload
```

### Testing Full Middleware Stack
```bash
# Test full middleware in development
export ENABLE_DEVELOPMENT_MODE=false
uvicorn main:app --reload
```

### Production Mode
```bash
# Production automatically uses full middleware stack
export ENVIRONMENT=production
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Middleware Details

### Kept in Development Mode
- **SecurityHeadersMiddleware**: Essential security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **CORSMiddleware**: Required for frontend communication

### Disabled in Development Mode
- **RequestValidationMiddleware**: 
  - SQL injection pattern matching
  - Request size validation
  - JSON depth validation
  - Can cause performance issues with large payloads

- **MultiTenancyMiddleware**:
  - Location-based access control
  - Database queries for user locations
  - Not needed for single-user development

- **FinancialSecurityMiddleware**:
  - Velocity checks with Redis
  - Suspicious pattern detection
  - Can cause blocking operations

- **MFAEnforcementMiddleware**:
  - Multi-factor authentication checks
  - Session management
  - Database lookups for MFA status

- **SentryEnhancementMiddleware**:
  - JWT token decoding
  - Error context enhancement
  - External service calls

## Benefits

1. **Faster Development**: No middleware-related blocking operations
2. **Easier Debugging**: Simplified request pipeline
3. **Reduced Dependencies**: No Redis or Sentry requirements in development
4. **Flexible Testing**: Can enable full middleware when needed

## Security Considerations

- **Development Only**: This configuration should NEVER be used in production
- **Testing Required**: Full middleware stack must be tested before production deployment
- **Environment Validation**: Production deployment scripts should verify middleware configuration

## Troubleshooting

### Backend Still Hangs
1. Check environment variables are set correctly
2. Verify no other blocking operations in routers
3. Check database connection issues
4. Review rate limiting configuration

### Need Full Middleware for Testing
```bash
export ENABLE_DEVELOPMENT_MODE=false
```

### Production Deployment
Ensure `ENVIRONMENT=production` is set - this automatically enables full middleware stack regardless of `ENABLE_DEVELOPMENT_MODE` setting.

## Files Modified
- `/Users/bossio/6fb-booking/backend-v2/main.py` - Added environment-based middleware loading
- `/Users/bossio/6fb-booking/backend-v2/.env` - Added development mode configuration
- `/Users/bossio/6fb-booking/backend-v2/start_dev_lightweight.py` - Created lightweight startup script