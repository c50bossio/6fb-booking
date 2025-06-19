# Frontend Deployment on Render

## Steps to Deploy Frontend

### 1. Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (if not already connected)
4. Select the `6fb-booking` repository
5. Configure the service:

**Basic Settings:**
- Name: `sixfb-frontend`
- Region: Oregon (US West) - same as backend
- Branch: `main`
- Root Directory: `frontend`
- Runtime: Node

**Build & Deploy:**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

### 2. Environment Variables

Add these environment variables in Render:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1
NEXT_PUBLIC_APP_URL=https://sixfb-frontend.onrender.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=6FB Booking Platform

# Features (all enabled for now)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true

# WebSocket URL
NEXT_PUBLIC_WS_URL=wss://sixfb-backend.onrender.com/ws

# Stripe (add your key here)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Image domains
NEXT_PUBLIC_IMAGE_DOMAINS=localhost,stripe.com,sixfb-backend.onrender.com

# Cache
NEXT_PUBLIC_CACHE_TTL=300000
```

### 3. Deploy

1. Click "Create Web Service"
2. Wait for the build and deployment to complete (5-10 minutes)
3. Your frontend will be available at: https://sixfb-frontend.onrender.com

### 4. Post-Deployment

1. Test the frontend loads correctly
2. Verify it can connect to the backend API
3. Test login with your admin credentials:
   - Email: c50bossio@gmail.com
   - Password: Welcome123!

### 5. Update Backend CORS

The backend CORS settings already include the Render frontend URL, but verify it's working:
- Check that API calls from frontend succeed
- No CORS errors in browser console

## Troubleshooting

**Build Failures:**
- Check Node version compatibility
- Ensure all dependencies are in package.json
- Check build logs in Render dashboard

**API Connection Issues:**
- Verify NEXT_PUBLIC_API_URL is correct
- Check backend CORS settings
- Ensure backend is running

**Blank Page:**
- Check browser console for errors
- Verify environment variables are set
- Check Next.js build output

**Performance:**
- First load may be slow on free tier
- Consider upgrading if needed
- Enable caching where possible