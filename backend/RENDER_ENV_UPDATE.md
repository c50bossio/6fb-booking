# Render Environment Variable Update Guide

To fix CORS for Railway frontend, add this environment variable to your Render service:

## Environment Variable to Add:

```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://bookbarber-6fb.vercel.app,https://web-production-92a6c.up.railway.app
```

## Steps to Update on Render:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service (sixfb-backend)
3. Go to "Environment" tab
4. Add or update the `ALLOWED_ORIGINS` variable
5. Include all necessary URLs separated by commas:
   - Local development: `http://localhost:3000,http://localhost:3001`
   - Vercel deployments: `https://bookbarber-6fb.vercel.app`
   - Railway frontend: `https://web-production-92a6c.up.railway.app`
6. Click "Save Changes"
7. The service will automatically redeploy

## Additional CORS-friendly URLs to consider:

If you have other frontend deployments, add them to the comma-separated list:
- Staging: `https://staging.bookbarber.com`
- Production: `https://bookbarber.com`
- Other Vercel previews: `https://bookbarber-*.vercel.app`

## Testing CORS:

After deployment, test with:

```bash
curl -I -X OPTIONS https://sixfb-backend.onrender.com/api/v1/health \
  -H "Origin: https://web-production-92a6c.up.railway.app" \
  -H "Access-Control-Request-Method: GET"
```

You should see `Access-Control-Allow-Origin: https://web-production-92a6c.up.railway.app` in the response headers.
