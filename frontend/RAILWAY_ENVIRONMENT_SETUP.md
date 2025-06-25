# Railway Production Environment Variables Setup

## Critical Missing Environment Variables

The following environment variables must be set in Railway for the frontend to work correctly:

### 1. Backend API URL
```bash
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1
```
**Status**: Currently missing or set to invalid value
**Impact**: Causes 404 errors like "/undefined/dashboard/appointments/today"
**Fix**: Set this exact value in Railway environment variables

### 2. Stripe Configuration
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
```
**Status**: Missing (causes console warnings)
**Impact**: Stripe payment integration will not work
**Fix**: Add your actual Stripe publishable key from Stripe Dashboard

### 3. Environment Indicator
```bash
NEXT_PUBLIC_ENVIRONMENT=production
```
**Status**: Recommended for production deployments
**Impact**: Affects CORS behavior and error handling
**Fix**: Add this to identify production environment

## How to Set Variables in Railway

1. Go to your Railway project dashboard
2. Click on your frontend service
3. Go to the "Variables" tab
4. Click "New Variable" and add:
   - **Variable**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://sixfb-backend.onrender.com/api/v1`
5. Click "New Variable" and add:
   - **Variable**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Value**: Your actual Stripe publishable key (starts with `pk_test_` or `pk_live_`)
6. Click "New Variable" and add:
   - **Variable**: `NEXT_PUBLIC_ENVIRONMENT`
   - **Value**: `production`
7. Click "Deploy" to redeploy with new environment variables

## Verification

After setting the variables and redeploying:

1. Check browser console for errors:
   - No more "/undefined/" API calls
   - No more "Stripe publishable key not found" warnings

2. Test calendar functionality:
   - Calendar should load without JavaScript errors
   - Appointment clicks should work properly
   - No "Cannot access 'B' before initialization" errors

3. Test API connectivity:
   - API calls should go to `https://sixfb-backend.onrender.com/api/v1/*`
   - CORS should work properly or fall back to proxy mode

## Current Backend Configuration

- **Backend URL**: https://sixfb-backend.onrender.com
- **API Base**: https://sixfb-backend.onrender.com/api/v1
- **Health Check**: https://sixfb-backend.onrender.com/health
- **API Docs**: https://sixfb-backend.onrender.com/docs

## Troubleshooting

If issues persist after setting environment variables:

1. **Hard refresh** the browser (Ctrl+F5 or Cmd+Shift+R)
2. **Clear browser cache** for the Railway domain
3. **Check Railway deployment logs** for any build errors
4. **Verify environment variables** are actually set in Railway dashboard
5. **Wait 2-3 minutes** for Railway to fully deploy changes

## Related Files Updated

- ✅ Updated `.env.template` to include missing frontend variables
- ✅ Fixed SSR guards in PremiumCalendar.tsx
- ✅ Fixed UnifiedCalendar.tsx prop destructuring
- ✅ Updated API integration to use corsAwareFetch helper

Next step: Set these environment variables in Railway and redeploy!
