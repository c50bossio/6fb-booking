# Render Frontend Deployment Guide

## Prerequisites Checklist

Before starting the deployment:

1. **Commit and Push Changes**
   ```bash
   # Check uncommitted changes
   git status

   # If you have changes to commit:
   git add .
   git commit -m "Prepare frontend for Render deployment"
   git push origin main
   ```

2. **Verify Backend is Running**
   - Backend URL: https://sixfb-backend.onrender.com
   - Check health: https://sixfb-backend.onrender.com/health

## Step 1: Deploy Using Render Blueprint (Recommended)

### Option A: Deploy Complete Stack (If Not Already Deployed)

1. **Go to Render Dashboard**
   - Navigate to https://dashboard.render.com
   - Click "New +" → "Blueprint"

2. **Connect Your Repository**
   - Click "Connect GitHub" if not already connected
   - Select your repository: `6fb-booking`
   - Choose branch: `main`

3. **Render Will Detect render.yaml**
   - Render will automatically detect the `render.yaml` file
   - It will show both services:
     - `6fb-booking-backend` (already deployed)
     - `6fb-booking-frontend` (to be deployed)
     - `6fb-booking-db` (database)

4. **Review Services**
   - Click "Next"
   - You'll see all services listed
   - The backend should show as "Already exists" if deployed

5. **Configure Frontend Environment Variables**
   - Find `6fb-booking-frontend` service
   - Click on it to expand
   - Review the environment variables:
     ```
     NODE_ENV: production
     NEXT_PUBLIC_API_URL: https://sixfb-backend.onrender.com
     PORT: 3000
     NEXT_TELEMETRY_DISABLED: 1
     ```
   - Add any missing variables (Stripe key if needed)

6. **Deploy**
   - Click "Apply" at the bottom
   - Render will start building the frontend

### Option B: Deploy Frontend Only (If Backend Already Exists)

1. **Go to Render Dashboard**
   - Navigate to https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub repository
   - Select `6fb-booking` repository
   - Choose branch: `main`

3. **Configure Service Settings**
   ```
   Name: 6fb-booking-frontend
   Region: Oregon (US West)
   Branch: main
   Root Directory: frontend
   Runtime: Node
   Build Command: npm ci && npm run build
   Start Command: npm run start
   Plan: Starter ($7/month)
   ```

4. **Add Environment Variables**
   Click "Advanced" and add these environment variables:

   | Key | Value |
   |-----|-------|
   | NODE_ENV | production |
   | NEXT_PUBLIC_API_URL | https://sixfb-backend.onrender.com |
   | PORT | 3000 |
   | NEXT_TELEMETRY_DISABLED | 1 |
   | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | (your Stripe publishable key - optional) |

5. **Create Web Service**
   - Click "Create Web Service"
   - Render will start the deployment

## Step 2: Monitor Deployment

### Deployment Timeline
- **Build Phase**: 3-5 minutes
  - Installing dependencies
  - Building Next.js application
  - Creating production bundle

- **Deploy Phase**: 1-2 minutes
  - Starting the service
  - Health checks

### What to Watch For
1. **In Render Dashboard**:
   - Green checkmark: Build successful
   - "Live" status: Service is running
   - Check logs for any errors

2. **Build Logs Should Show**:
   ```
   ==> Cloning from https://github.com/YOUR_USERNAME/6fb-booking
   ==> Checking out commit abc123...
   ==> Detected Node version 18.x
   ==> Running build command 'cd frontend && npm ci && npm run build'
   > 6fb-frontend@0.1.0 build
   > next build
   ✓ Creating an optimized production build
   ✓ Compiled successfully
   ✓ Collecting page data
   ✓ Generating static pages
   ```

## Step 3: Post-Deployment Verification

1. **Check Frontend URL**
   - Your frontend will be available at: `https://6fb-booking-frontend.onrender.com`
   - Visit the URL and verify the homepage loads

2. **Test Critical Pages**
   ```bash
   # Run the monitoring script (see below)
   cd /Users/bossio/6fb-booking/backend
   python scripts/monitor-frontend-deployment.py
   ```

3. **Manual Verification Checklist**
   - [ ] Homepage loads correctly
   - [ ] Login page is accessible
   - [ ] API connection works (check browser console)
   - [ ] Booking flow initiates properly
   - [ ] Dashboard loads (after login)

## Step 4: Configure Custom Domain (Optional)

1. **In Render Dashboard**:
   - Go to your frontend service
   - Click "Settings" → "Custom Domains"
   - Add your domain (e.g., `app.6figurebarber.com`)

2. **Update DNS Records**:
   - Add CNAME record pointing to `6fb-booking-frontend.onrender.com`
   - Or use Render's provided A records

3. **Update Environment Variables**:
   - Update `CORS_ALLOWED_ORIGINS` in backend to include your custom domain

## Step 5: Update Backend CORS

1. **In Backend Service on Render**:
   - Go to Environment variables
   - Update `CORS_ALLOWED_ORIGINS` to include frontend URL:
   ```
   https://6fb-booking-frontend.onrender.com,https://sixfb-frontend.onrender.com,http://localhost:3000
   ```

## Troubleshooting Common Issues

### Build Failures
1. **"Module not found" errors**
   - Check all imports are correct
   - Ensure no missing dependencies in package.json

2. **"Cannot find module 'sharp'" error**
   - This is a Next.js image optimization issue
   - Add to package.json if needed: `"sharp": "^0.33.0"`

3. **Build timeout**
   - Build is taking too long (>15 minutes)
   - Check for large assets or infinite loops in build

### Runtime Issues
1. **"Failed to connect to API"**
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check backend is running
   - Verify CORS settings

2. **"500 Internal Server Error"**
   - Check Render logs for specific errors
   - Verify all environment variables are set
   - Check for missing dependencies

### Quick Fixes
```bash
# Clear build cache (in Render dashboard)
Settings → Build & Deploy → Clear build cache

# Force redeploy
Manual Deploy → Deploy latest commit

# Check service logs
Logs → Filter by "error" or "warn"
```

## Monitoring Commands

After deployment, use these commands to verify everything is working:

```bash
# Check if frontend is accessible
curl -I https://6fb-booking-frontend.onrender.com

# Test API connectivity from frontend
curl https://6fb-booking-frontend.onrender.com/api/health

# Monitor frontend performance
curl -w "@curl-format.txt" -o /dev/null -s https://6fb-booking-frontend.onrender.com
```

## Next Steps

1. **Set up monitoring**:
   - Add UptimeRobot for uptime monitoring
   - Configure alerts in Render dashboard

2. **Performance optimization**:
   - Enable Render's CDN
   - Configure caching headers
   - Consider upgrading to Standard plan for better performance

3. **Security**:
   - Review security headers
   - Enable HTTPS redirect (automatic on Render)
   - Set up rate limiting if needed

## Support Resources

- Render Documentation: https://render.com/docs
- Render Status: https://status.render.com
- Next.js on Render: https://render.com/docs/deploy-nextjs
- Community Forum: https://community.render.com

---

**Note**: Keep this guide handy during deployment. The entire process typically takes 10-15 minutes from start to finish.
