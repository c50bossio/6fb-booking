# Railway Environment Setup Guide

## Frontend Issues Fixed:

### 1. CORS Configuration ✅
- Updated backend to allow Railway URLs dynamically
- Enhanced CORS preflight handling
- Added specific Railway domain patterns

### 2. Stripe Configuration ✅
- Updated production environment to use test Stripe key temporarily
- You can update to live key when ready for production payments

### 3. API URL Configuration ✅
- Updated frontend `.env.production` to use Railway backend URL
- Set correct WebSocket URL for Railway deployment

### 4. Barber Payments Route ✅
- Verified the route exists and is properly configured
- All necessary API endpoints are available

## Railway Environment Variables to Set:

For your **backend** deployment on Railway, ensure these environment variables are set:

```bash
# Core Configuration
ENVIRONMENT=production
DATABASE_URL=<your-railway-postgres-url>
SECRET_KEY=<your-secure-secret-key>
JWT_SECRET_KEY=<your-jwt-secret-key>

# CORS Configuration (automatically handled by code)
ALLOWED_ORIGINS=https://6fb-booking-frontend.up.railway.app,https://6fb-booking-frontend-production.up.railway.app

# Stripe Configuration
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Email Configuration (optional)
SMTP_USERNAME=<your-email>
SMTP_PASSWORD=<your-email-password>
FROM_EMAIL=<your-email>
```

For your **frontend** deployment on Railway, ensure these environment variables are set:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://web-production-92a6c.up.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://web-production-92a6c.up.railway.app/ws

# Stripe Configuration
# Get publishable key from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
NODE_ENV=production
```

## Testing the Fix:

1. **Test CORS**: Run the test script
   ```bash
   cd backend
   python test_cors_production.py
   ```

2. **Test Barber Payments Page**:
   - Visit: `https://your-frontend-url/barber-payments`
   - Should load without CORS errors
   - Should display Stripe configuration properly

3. **Check Browser Console**:
   - No CORS preflight errors
   - API calls should work
   - Stripe should initialize properly

## Common Issues & Solutions:

### Issue: "Stripe publishable key is not configured"
**Solution**: Environment variable is now set correctly in production config

### Issue: CORS preflight failures
**Solution**: Enhanced CORS middleware now handles Railway URLs dynamically

### Issue: 404 on /barber-payments
**Solution**: Route exists and is properly configured, ensure frontend deployment is using correct build

### Issue: API calls failing
**Solution**: Updated API URL to use Railway backend URL instead of Render

## Next Steps:

1. Deploy the updated backend code to Railway
2. Deploy the updated frontend code to Railway
3. Test the barber payments page
4. Update to live Stripe keys when ready for production
5. Monitor logs for any remaining issues

## Monitoring:

Check Railway logs for:
- CORS origin allowance messages
- API request success/failures
- Any authentication issues
- Database connection status
