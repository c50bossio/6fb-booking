# POS Production Deployment Instructions

## 🚀 Deployment Steps

### 1. Review and Merge Pull Request
- Review PR #2: https://github.com/c50bossio/6fb-booking/pull/2
- Ensure all checks pass
- Merge to main branch

### 2. Render.com Auto-Deployment
Once merged to main, Render will automatically:
- Build backend and frontend
- Run database migrations
- Deploy to production

### 3. Environment Variables to Add (Render Dashboard)

#### Backend Service (6fb-booking-backend)
Add these new environment variables:
```
# Redis Configuration (Optional but recommended)
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=<your-redis-password>

# POS Security Settings
PIN_RATE_LIMIT_MAX_ATTEMPTS=5
PIN_RATE_LIMIT_WINDOW=60
SESSION_TIMEOUT=30
SESSION_WARNING_TIME=25
AUDIT_LOG_RETENTION_DAYS=90

# CSRF Protection (set to true for production)
CSRF_STRICT_MODE=true
```

#### Frontend Service (6fb-booking-frontend)
No new environment variables needed for POS features.

### 4. Post-Deployment Verification

#### A. Test PIN Authentication
```bash
# Test with curl (replace with your production URL)
curl -X POST https://sixfb-backend.onrender.com/api/v1/barber-pin/authenticate \
  -H "Content-Type: application/json" \
  -d '{"barber_id": 1, "pin": "1234", "device_info": "deployment-test"}'
```

#### B. Verify POS Access
1. Navigate to https://sixfb-frontend.onrender.com/pos
2. Test PIN login with a test barber account
3. Verify product loading and checkout flow

#### C. Check Health Endpoints
```bash
# Backend health
curl https://sixfb-backend.onrender.com/api/v1/health

# Check rate limiting is active
curl https://sixfb-backend.onrender.com/api/v1/pos/health
```

### 5. Seed Test Data (Optional)

If you need test data for POS:

1. SSH into backend service via Render dashboard
2. Run seed script:
```bash
cd /opt/render/project/src/backend
python seed_pos_test_data.py
```

Test PINs will be:
- Mike Johnson: 1234
- Sarah Williams: 5678
- David Chen: 9012
- Lisa Martinez: 3456

### 6. Monitor Deployment

#### Render Dashboard
- Check service logs for errors
- Monitor metrics (CPU, Memory, Response times)
- Verify both services are healthy

#### Application Monitoring
- Check Sentry for any new errors
- Monitor rate limiting effectiveness
- Review audit logs for security events

### 7. Rollback Plan

If issues arise:

1. **Quick Rollback via Render**:
   - Go to service settings
   - Deploy previous commit
   - Render will automatically rollback

2. **Manual Rollback**:
   ```bash
   git revert HEAD
   git push origin main
   ```

### 8. Security Checklist

- [ ] CSRF strict mode enabled in production
- [ ] Rate limiting verified working
- [ ] Session timeouts configured
- [ ] Audit logging functional
- [ ] No sensitive data in logs
- [ ] HTTPS enforced on all endpoints

## 📊 Success Criteria

The deployment is successful when:
1. ✅ Both services show as "Live" in Render
2. ✅ Health checks return 200 OK
3. ✅ PIN authentication works
4. ✅ POS terminal loads products
5. ✅ Test transaction completes successfully
6. ✅ No errors in Sentry
7. ✅ Rate limiting blocks after 5 attempts

## 🆘 Troubleshooting

### Redis Connection Issues
If Redis is not available, the system will fall back to in-memory storage. This is fine for testing but not recommended for production.

### Migration Failures
Check Render logs. If migrations fail:
1. SSH into backend service
2. Run manually: `alembic upgrade head`
3. Check for schema conflicts

### CORS Issues
Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL:
```
CORS_ALLOWED_ORIGINS=https://sixfb-frontend.onrender.com
```

### Session Timeout Issues
Adjust these values as needed:
- `SESSION_TIMEOUT`: Total session duration (minutes)
- `SESSION_WARNING_TIME`: When to show warning (minutes)

## 📞 Support

For deployment issues:
1. Check Render service logs
2. Review Sentry error tracking
3. Check this PR for implementation details: #2

---
Last Updated: 2025-06-27
