# Railway Frontend CORS Fix Guide

## Problem Summary
Your Railway frontend at `https://web-production-92a6c.up.railway.app` is being blocked by CORS when trying to access the backend at `https://sixfb-backend.onrender.com`.

## Solution Overview
We've updated the backend configuration to allow Railway URLs. Now you need to deploy these changes and update the environment variables on Render.

## Changes Made

### 1. Updated `backend-v2/config/settings.py`
- Added Railway URL patterns to the `is_allowed_origin` method
- Added specific Railway URLs to the default origins list
- Now accepts any URL ending with `.railway.app`

### 2. Updated `backend-v2/.env` (local)
- Added Railway URL to `ALLOWED_ORIGINS` environment variable

## Deployment Steps

### Step 1: Update Render Environment Variables

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service (`sixfb-backend`)
3. Navigate to the "Environment" tab
4. Add or update the `ALLOWED_ORIGINS` environment variable with:

```
http://localhost:3000,http://localhost:3001,https://bookbarber-6fb.vercel.app,https://web-production-92a6c.up.railway.app,https://bookbarber.com
```

5. Click "Save Changes"
6. The service will automatically redeploy (takes 2-3 minutes)

### Step 2: Deploy Code Changes

If your Render service is connected to GitHub:
1. Commit the changes:
   ```bash
   git add backend-v2/config/settings.py
   git commit -m "fix: Add Railway URL to CORS allowed origins"
   git push origin main
   ```
2. Render will automatically deploy the new code

If manually deploying:
1. Push the updated code to your deployment branch
2. Trigger a manual deploy on Render

### Step 3: Verify the Fix

After deployment completes, test CORS:

```bash
# Run the test script
./test-railway-cors.sh

# Or manually test with curl
curl -I -X OPTIONS https://sixfb-backend.onrender.com/api/v1/health \
  -H "Origin: https://web-production-92a6c.up.railway.app" \
  -H "Access-Control-Request-Method: GET"
```

You should see:
- `Access-Control-Allow-Origin: https://web-production-92a6c.up.railway.app`
- Status code 200 or 204

### Step 4: Test in Browser

1. Open your Railway frontend: https://web-production-92a6c.up.railway.app
2. Open browser Developer Tools (F12)
3. Go to Network tab
4. Try to log in or access any API endpoint
5. Check that requests succeed without CORS errors

## Alternative Solutions (If Primary Fix Doesn't Work)

### Option 1: Use Wildcard for Development
In development/staging, you can temporarily use a wildcard:
```
ALLOWED_ORIGINS=*
```
⚠️ **Never use wildcard in production!**

### Option 2: Frontend Proxy
The frontend already has a CORS proxy at `/api/proxy/*` that can bypass CORS:
- Instead of: `https://sixfb-backend.onrender.com/api/v1/auth/token`
- Use: `/api/proxy/auth/token`

### Option 3: Update Backend Middleware
If the dynamic CORS middleware isn't working, you can temporarily switch to standard CORS middleware:

```python
# In backend-v2/main.py, replace DynamicCORSMiddleware with:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://web-production-92a6c.up.railway.app", "*"],  # Add specific URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### CORS Still Blocked?
1. **Check Render logs**: Look for "Rejected CORS origin" messages
2. **Verify environment variable**: Ensure `ALLOWED_ORIGINS` is set correctly on Render
3. **Clear browser cache**: Sometimes old CORS policies are cached
4. **Check service worker**: Disable service worker temporarily to test

### Common Issues
1. **Typo in URL**: Ensure exact match including `https://` and no trailing slash
2. **Missing deployment**: Make sure both code and env vars are updated
3. **Caching**: Render might cache responses - wait a few minutes after deploy

## Quick Test HTML
Save this as `test-railway-login.html` and open in browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Railway CORS Test</title>
</head>
<body>
    <h1>Railway Frontend CORS Test</h1>
    <button onclick="testCORS()">Test Backend Connection</button>
    <pre id="result"></pre>

    <script>
        async function testCORS() {
            const result = document.getElementById('result');
            result.textContent = 'Testing...';

            try {
                const response = await fetch('https://sixfb-backend.onrender.com/api/v1/health', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                const data = await response.json();
                result.textContent = 'SUCCESS! Backend is accessible.\n' + JSON.stringify(data, null, 2);
            } catch (error) {
                result.textContent = 'CORS ERROR: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

## Summary
1. ✅ Backend code updated to accept Railway URLs
2. 📋 Update `ALLOWED_ORIGINS` on Render with Railway URL
3. 🚀 Deploy changes (automatic or manual)
4. 🧪 Test with provided script or browser
5. 🎉 Railway frontend should now work without CORS errors

If issues persist after following these steps, check the Render logs for specific error messages about rejected origins.
