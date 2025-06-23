# Frontend Deployment Guide for Render

This guide provides step-by-step instructions for deploying the 6FB Booking Platform frontend to Render.

## Prerequisites

- GitHub repository connected to Render
- Backend service already deployed and running
- Render account with at least Starter plan ($7/month)
- Stripe account for payment processing (optional)

## Pre-Deployment Checklist

### 1. Validate Frontend Build

Run the validation script to ensure your frontend is ready for deployment:

```bash
cd frontend
npm run validate:build
```

This script will check:
- Node.js version (18+ required)
- Required configuration files
- Dependencies installation
- Build process
- Common deployment issues

### 2. Environment Variables

The frontend requires the following environment variables in Render:

#### Required Variables
- `NODE_ENV`: Set to `production`
- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://sixfb-backend.onrender.com`)
- `PORT`: Set to `3000` (Render will override with its own port)

#### Optional Variables
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `NEXT_PUBLIC_GA_TRACKING_ID`: Google Analytics tracking ID
- `NEXT_PUBLIC_SITE_URL`: Your frontend URL (e.g., `https://6fb-booking-frontend.onrender.com`)
- `NEXT_TELEMETRY_DISABLED`: Set to `1` to disable Next.js telemetry

## Deployment Steps

### Step 1: Configure render.yaml

The `render.yaml` file in the root directory already contains the frontend configuration:

```yaml
services:
  - type: web
    name: 6fb-booking-frontend
    env: node
    region: oregon
    plan: starter
    buildCommand: |
      cd frontend && \
      npm ci && \
      npm run build
    startCommand: cd frontend && npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: https://sixfb-backend.onrender.com
      # Add other environment variables as needed
    healthCheckPath: /
    autoDeploy: true
```

### Step 2: Connect GitHub Repository

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub account if not already connected
4. Select your repository (e.g., `yourusername/6fb-booking`)
5. Render will detect the `render.yaml` file automatically

### Step 3: Deploy via render.yaml

1. In the Render dashboard, click "New" → "Blueprint"
2. Select your GitHub repository
3. Render will automatically detect `render.yaml`
4. Review the services to be created:
   - `6fb-booking-frontend` (Web Service)
   - `6fb-booking-backend` (if not already deployed)
   - `6fb-booking-db` (if not already created)
5. Click "Apply" to create all services

### Step 4: Configure Environment Variables

After the service is created:

1. Go to your frontend service in Render dashboard
2. Navigate to "Environment" tab
3. Add/verify the following variables:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://your-frontend-url.onrender.com
NEXT_TELEMETRY_DISABLED=1
```

### Step 5: Monitor Deployment

1. Go to the "Events" tab to monitor the deployment progress
2. Check the build logs for any errors
3. The deployment typically takes 5-10 minutes
4. Once deployed, visit the service URL to verify

### Step 6: Verify API Connectivity

After deployment, verify the frontend can connect to the backend:

1. Open browser developer tools
2. Visit your frontend URL
3. Check Network tab for API calls to your backend
4. Ensure no CORS errors appear
5. Test login functionality

## Post-Deployment Configuration

### 1. Update CORS Settings

Ensure your backend allows requests from the frontend:

1. In backend service environment variables, update:
   ```
   CORS_ALLOWED_ORIGINS=https://6fb-booking-frontend.onrender.com,http://localhost:3000
   ```
2. Redeploy the backend if needed

### 2. Configure Custom Domain (Optional)

1. Go to "Settings" → "Custom Domains"
2. Add your domain (e.g., `app.yourdomain.com`)
3. Follow Render's DNS configuration instructions
4. Update environment variables with new domain

### 3. Set Up Health Monitoring

1. Render automatically monitors the health check endpoint (`/`)
2. Configure additional monitoring in "Settings" → "Health & Alerts"
3. Set up email alerts for service failures

### 4. Enable Auto-Deploy

Auto-deploy is enabled by default in `render.yaml`. To modify:

1. Go to "Settings" → "Build & Deploy"
2. Toggle "Auto-Deploy" on/off
3. Configure branch to deploy from (default: `main`)

## Troubleshooting

### Build Failures

If the build fails:

1. Check build logs in the "Events" tab
2. Common issues:
   - Missing dependencies: Ensure `package-lock.json` is committed
   - Node version mismatch: Render uses Node 20 by default
   - Memory issues: Consider upgrading to Standard plan

### Runtime Errors

1. Check runtime logs in the "Logs" tab
2. Common issues:
   - Missing environment variables
   - API connection failures
   - Port binding issues

### Performance Issues

1. Enable standalone output in `next.config.js` (already configured)
2. Consider enabling caching headers
3. Use Render's CDN for static assets
4. Monitor memory usage and upgrade plan if needed

## Maintenance

### Updating the Frontend

1. **Via Git Push** (Auto-deploy enabled):
   ```bash
   git add .
   git commit -m "Update frontend"
   git push origin main
   ```

2. **Manual Deploy**:
   - Go to "Manual Deploy" in Render dashboard
   - Click "Deploy latest commit"

### Rollback Procedure

1. Go to "Events" tab
2. Find a previous successful deploy
3. Click "Rollback to this deploy"

### Monitoring Logs

```bash
# View logs in Render dashboard
# Or use Render CLI:
render logs 6fb-booking-frontend --tail
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to Git
2. **API Keys**: Use separate keys for production
3. **HTTPS**: Render provides SSL certificates automatically
4. **Headers**: Security headers are configured in `next.config.js`

## Performance Optimization

1. **Caching**: Configure cache headers for static assets
2. **Image Optimization**: Next.js automatically optimizes images
3. **Bundle Size**: Monitor with `npm run build`
4. **CDN**: Consider using Cloudflare for global distribution

## Cost Optimization

- **Starter Plan** ($7/month): Suitable for small to medium traffic
- **Standard Plan** ($25/month): For production workloads
- **Scaling**: Render automatically scales within plan limits
- **Bandwidth**: Monitor usage to avoid overages

## Support Resources

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [6FB Platform Documentation](/docs/README.md)
- Render Support: support@render.com

## Final Checklist

- [ ] Frontend builds successfully locally
- [ ] All environment variables configured in Render
- [ ] Backend API URL is correct
- [ ] CORS settings updated on backend
- [ ] Health check endpoint responds
- [ ] Auto-deploy enabled (optional)
- [ ] Custom domain configured (optional)
- [ ] Monitoring alerts set up
- [ ] Test user login and basic functionality
- [ ] Verify Stripe integration (if applicable)

Once all items are checked, your frontend is successfully deployed to Render!
