# 🚨 EMERGENCY CORS FIX GUIDE

## Issue
The backend at `https://sixfb-backend.onrender.com` is not allowing requests from the Vercel frontend at `https://bookbarber-fz9nh51da-6fb.vercel.app`.

## Immediate Solutions (Priority Order)

### SOLUTION 1: Update Render Environment Variables (FASTEST - 2 minutes)

1. **Go to Render Dashboard**:
   - Visit https://dashboard.render.com
   - Find your `sixfb-backend` service
   - Click on the service name

2. **Update Environment Variables**:
   - Go to "Environment" tab
   - Add or update these variables:

   ```
   ALLOWED_ORIGINS=https://bookbarber-fz9nh51da-6fb.vercel.app,http://localhost:3000,http://localhost:3001
   FRONTEND_URL=https://bookbarber-fz9nh51da-6fb.vercel.app
   ```

3. **Deploy Changes**:
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait 2-3 minutes for deployment
   - Backend will automatically restart with new CORS settings

### SOLUTION 2: Test CORS Fix (Run This Script)

Create this test script to verify CORS is working:

```bash
#!/bin/bash
# File: test_cors.sh

echo "Testing CORS configuration..."
echo "================================"

# Test preflight request
echo "1. Testing preflight OPTIONS request:"
curl -v \
  -X OPTIONS \
  -H "Origin: https://bookbarber-fz9nh51da-6fb.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  https://sixfb-backend.onrender.com/api/v1/auth/token

echo -e "\n\n2. Testing actual POST request:"
curl -v \
  -X POST \
  -H "Origin: https://bookbarber-fz9nh51da-6fb.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"testpass"}' \
  https://sixfb-backend.onrender.com/api/v1/auth/token

echo -e "\n\n3. Testing health endpoint:"
curl -v \
  -H "Origin: https://bookbarber-fz9nh51da-6fb.vercel.app" \
  https://sixfb-backend.onrender.com/health

echo -e "\n\nTest complete!"
```

Save as `test_cors.sh`, run: `chmod +x test_cors.sh && ./test_cors.sh`

### SOLUTION 3: Alternative Render Update Method

If the dashboard method doesn't work:

1. **Via Render CLI** (if installed):
   ```bash
   render env set ALLOWED_ORIGINS="https://bookbarber-fz9nh51da-6fb.vercel.app,http://localhost:3000"
   render env set FRONTEND_URL="https://bookbarber-fz9nh51da-6fb.vercel.app"
   render deploy
   ```

2. **Via render.yaml** (if you have one):
   Add to your render.yaml:
   ```yaml
   services:
     - type: web
       name: sixfb-backend
       env: python
       envVars:
         - key: ALLOWED_ORIGINS
           value: "https://bookbarber-fz9nh51da-6fb.vercel.app,http://localhost:3000"
         - key: FRONTEND_URL
           value: "https://bookbarber-fz9nh51da-6fb.vercel.app"
   ```

### SOLUTION 4: Temporary Bypass (If Above Don't Work)

If CORS updates take too long, create a temporary proxy:

1. **Create proxy endpoint in your Vercel app**:
   ```javascript
   // File: frontend/src/app/api/proxy/[...path]/route.ts
   import { NextRequest, NextResponse } from 'next/server';

   export async function GET(
     request: NextRequest,
     { params }: { params: { path: string[] } }
   ) {
     return handleProxy(request, params.path, 'GET');
   }

   export async function POST(
     request: NextRequest,
     { params }: { params: { path: string[] } }
   ) {
     return handleProxy(request, params.path, 'POST');
   }

   export async function PUT(
     request: NextRequest,
     { params }: { params: { path: string[] } }
   ) {
     return handleProxy(request, params.path, 'PUT');
   }

   export async function DELETE(
     request: NextRequest,
     { params }: { params: { path: string[] } }
   ) {
     return handleProxy(request, params.path, 'DELETE');
   }

   async function handleProxy(
     request: NextRequest,
     pathSegments: string[],
     method: string
   ) {
     const backendUrl = 'https://sixfb-backend.onrender.com';
     const path = pathSegments.join('/');
     const url = `${backendUrl}/${path}`;

     const headers: Record<string, string> = {};

     // Copy relevant headers
     request.headers.forEach((value, key) => {
       if (key.startsWith('content-') || key === 'authorization') {
         headers[key] = value;
       }
     });

     let body = undefined;
     if (method !== 'GET' && method !== 'DELETE') {
       body = await request.text();
     }

     try {
       const response = await fetch(url, {
         method,
         headers,
         body,
       });

       const responseText = await response.text();

       return new NextResponse(responseText, {
         status: response.status,
         headers: {
           'Content-Type': response.headers.get('content-type') || 'application/json',
         },
       });
     } catch (error) {
       return NextResponse.json(
         { error: 'Proxy request failed', details: error.message },
         { status: 500 }
       );
     }
   }
   ```

2. **Update your API client to use proxy**:
   ```javascript
   // Temporary change in your API client
   const API_BASE_URL = process.env.NODE_ENV === 'production'
     ? '/api/proxy/api/v1'  // Use proxy temporarily
     : 'http://localhost:8000/api/v1';
   ```

### SOLUTION 5: Direct API Testing (Verify Backend Works)

Test the backend directly to confirm it's working:

```bash
# Test 1: Health check
curl https://sixfb-backend.onrender.com/health

# Test 2: API docs
curl https://sixfb-backend.onrender.com/docs

# Test 3: Login endpoint
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@6fb.com","password":"admin123"}' \
  https://sixfb-backend.onrender.com/api/v1/auth/token
```

## Browser Console Testing

Run this in your browser console on the Vercel site:

```javascript
// Test 1: Simple fetch
fetch('https://sixfb-backend.onrender.com/health')
  .then(response => response.text())
  .then(data => console.log('Health check:', data))
  .catch(error => console.error('Health check failed:', error));

// Test 2: Login request
fetch('https://sixfb-backend.onrender.com/api/v1/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin@6fb.com',
    password: 'admin123'
  })
})
.then(response => response.json())
.then(data => console.log('Login test:', data))
.catch(error => console.error('Login test failed:', error));
```

## Current Backend CORS Configuration

Based on the settings.py file, the backend should accept these origins:
- `http://localhost:3000`
- `http://localhost:3001`
- Value from `FRONTEND_URL` environment variable
- Values from `ALLOWED_ORIGINS` environment variable (comma-separated)

## Render Environment Variables to Set

Set these in Render dashboard:

```
ALLOWED_ORIGINS=https://bookbarber-fz9nh51da-6fb.vercel.app,http://localhost:3000,http://localhost:3001,https://6fb-booking.vercel.app
FRONTEND_URL=https://bookbarber-fz9nh51da-6fb.vercel.app
ENVIRONMENT=production
```

## Verification Steps

1. **Check Render logs** after deployment:
   - Go to Render dashboard → your service → "Logs"
   - Look for CORS-related messages

2. **Test with curl** (see scripts above)

3. **Test in browser console** (see JavaScript above)

4. **Check network tab** in browser dev tools for CORS headers

## If All Else Fails

1. **Create a new Render deployment** with correct settings
2. **Use the proxy solution** temporarily
3. **Switch to Railway or another platform** that's easier to configure

## Emergency Contact

If you need immediate help:
1. Check Render status page: https://status.render.com
2. Render community: https://community.render.com
3. This issue is likely resolved within 5-10 minutes of updating environment variables

## Success Indicators

✅ **CORS is fixed when you see:**
- No more CORS errors in browser console
- Login requests succeed
- Network tab shows proper CORS headers:
  - `Access-Control-Allow-Origin: https://bookbarber-fz9nh51da-6fb.vercel.app`
  - `Access-Control-Allow-Credentials: true`

## Prevention for Future

1. **Always set CORS origins** when deploying to new domains
2. **Use environment variables** instead of hardcoded values
3. **Test CORS immediately** after deployment
4. **Keep a list of all deployment URLs** for quick CORS updates
