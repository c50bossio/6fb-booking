# Frontend Environment Variables Setup Guide

This guide ensures all environment variables are correctly configured for the frontend deployment on Render.

## Environment Variable Reference

### Core Configuration

```bash
# Node environment
NODE_ENV=production

# API Configuration - CRITICAL
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com

# Frontend URL (update after deployment)
NEXT_PUBLIC_SITE_URL=https://6fb-booking-frontend.onrender.com

# Port (Render will override this)
PORT=3000

# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1
```

### Payment Integration (Stripe)

```bash
# Stripe Public Key (safe to expose in frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here

# Note: Never put secret keys in frontend environment variables!
```

### Analytics (Optional)

```bash
# Google Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# Or Google Analytics 4
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Feature Flags (Optional)

```bash
# Enable/disable features
NEXT_PUBLIC_ENABLE_GOOGLE_CALENDAR=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

## Setting Environment Variables in Render

### Method 1: Via Render Dashboard

1. Navigate to your frontend service
2. Go to "Environment" tab
3. Click "Add Environment Variable"
4. Add each variable with its value
5. Click "Save Changes"
6. Service will automatically redeploy

### Method 2: Via render.yaml

Update the `render.yaml` file:

```yaml
services:
  - type: web
    name: 6fb-booking-frontend
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: https://sixfb-backend.onrender.com
      - key: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        sync: false  # Set manually in dashboard
      # Add more as needed
```

### Method 3: Environment Groups (Recommended for Teams)

1. Create an environment group in Render
2. Add all frontend variables to the group
3. Link the group to your frontend service
4. Manage variables centrally

## Variable Usage in Code

### Correct Usage

```typescript
// In frontend code
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// In API client
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1'
})
```

### Important Notes

1. **Prefix Requirements**:
   - Frontend variables MUST start with `NEXT_PUBLIC_`
   - Variables without this prefix won't be available in browser

2. **Build Time vs Runtime**:
   - Next.js embeds env variables at build time
   - Changing variables requires rebuild/redeploy

3. **Security**:
   - Never expose secret keys in frontend
   - Use `NEXT_PUBLIC_` only for public data

## Validation Script

Create a script to validate environment variables:

```javascript
// scripts/validate-env.js
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'NODE_ENV'
];

const optionalEnvVars = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_GA_TRACKING_ID',
  'NEXT_PUBLIC_SITE_URL'
];

console.log('🔍 Validating environment variables...\n');

// Check required variables
let hasErrors = false;
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} = ${process.env[varName]}`);
  }
});

// Check optional variables
console.log('\nOptional variables:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName} = ${process.env[varName]}`);
  } else {
    console.log(`⚠️  ${varName} not set`);
  }
});

if (hasErrors) {
  console.error('\n❌ Environment validation failed!');
  process.exit(1);
} else {
  console.log('\n✅ Environment validation passed!');
}
```

## Common Issues and Solutions

### Issue: API calls failing with CORS errors

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` doesn't have trailing slash
2. Update backend CORS settings to include frontend URL
3. Check browser console for exact error

### Issue: Environment variables not available

**Solution**:
1. Ensure variable starts with `NEXT_PUBLIC_`
2. Rebuild after adding new variables
3. Check Render logs for build output

### Issue: Different behavior locally vs production

**Solution**:
1. Create `.env.local` for local development
2. Use same variable names as production
3. Test with `npm run build && npm run start` locally

## Testing Environment Variables

### Local Testing

```bash
# Create .env.local
cp .env.example .env.local

# Edit with your values
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key

# Test production build
npm run build
npm run start
```

### Production Testing

After deployment:

1. Open browser developer console
2. Type: `console.log(process.env.NEXT_PUBLIC_API_URL)`
3. Should output your backend URL
4. Check Network tab for API calls

## Backend Coordination

Ensure backend is configured to accept frontend requests:

```python
# Backend CORS settings
CORS_ALLOWED_ORIGINS = [
    "https://6fb-booking-frontend.onrender.com",
    "https://your-custom-domain.com",
    "http://localhost:3000"  # For local development
]
```

## Checklist for Deployment

- [ ] All required environment variables set in Render
- [ ] `NEXT_PUBLIC_API_URL` points to correct backend
- [ ] Backend CORS includes frontend URL
- [ ] Optional variables configured as needed
- [ ] No secret keys exposed in frontend variables
- [ ] Validation script passes
- [ ] Test API connectivity after deployment

## Quick Reference

```bash
# Required for deployment
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com
NODE_ENV=production

# Common optional
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://6fb-booking-frontend.onrender.com

# Render will set
PORT=<dynamic>

# Development only (don't set in production)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Remember: After setting or changing environment variables in Render, the service will automatically redeploy. Monitor the deployment logs to ensure success.
