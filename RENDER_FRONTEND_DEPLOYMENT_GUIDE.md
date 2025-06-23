# Render Frontend Deployment Guide for 6FB Booking Platform

This guide provides step-by-step instructions for deploying the 6FB Booking frontend to Render.com.

## Prerequisites

1. A Render.com account (sign up at https://render.com)
2. Your backend API already deployed (e.g., at https://sixfb-backend.onrender.com)
3. GitHub repository with the 6FB Booking code
4. Stripe Publishable Key (from Stripe Dashboard)

## Deployment Options

### Option 1: Using Render Dashboard (Recommended)

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect Your Repository**
   - Connect your GitHub account if not already connected
   - Select your 6FB Booking repository
   - Choose the branch to deploy (usually `main`)

3. **Configure the Service**
   ```
   Name: 6fb-booking-frontend
   Region: Oregon (or your preferred region)
   Branch: main
   Root Directory: frontend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm run start
   Plan: Starter ($7/month) or Free (with limitations)
   ```

4. **Add Environment Variables**
   Click "Advanced" and add these environment variables:
   ```
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_KEY
   NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX (optional)
   NEXT_TELEMETRY_DISABLED=1
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for the build and deployment to complete (5-10 minutes)
   - Your frontend will be available at `https://6fb-booking-frontend.onrender.com`

### Option 2: Using render.yaml File

1. **Update the render.yaml file** in your repository:
   - The main `render.yaml` at the root already includes frontend configuration
   - Or use `frontend/render-frontend.yaml` for frontend-only deployment

2. **Create Blueprint in Render**
   - Go to https://dashboard.render.com/blueprints
   - Click "New Blueprint Instance"
   - Connect your repository
   - Select the branch
   - Render will detect the render.yaml file
   - Review and apply the configuration

3. **Set Secret Environment Variables**
   After deployment, go to the service settings and add:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_GA_TRACKING_ID` (if using Google Analytics)

## Post-Deployment Configuration

### 1. Update Backend CORS Settings

Ensure your backend allows requests from your frontend URL:

```python
# In backend/config/settings.py
ALLOWED_ORIGINS = [
    "https://6fb-booking-frontend.onrender.com",
    "https://your-custom-domain.com"  # If using custom domain
]
```

### 2. Configure Custom Domain (Optional)

1. Go to your service settings in Render
2. Click "Settings" → "Custom Domains"
3. Add your domain (e.g., app.yourbarbershop.com)
4. Update DNS records as instructed by Render

### 3. SSL Certificate

- Render automatically provisions SSL certificates for all domains
- No additional configuration needed

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Node environment | Yes | `production` |
| `PORT` | Server port | Yes | `3000` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `https://sixfb-backend.onrender.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | Yes | `pk_live_...` |
| `NEXT_PUBLIC_GA_TRACKING_ID` | Google Analytics ID | No | `G-XXXXXXXXXX` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | No | `1` |

## Build Optimization

The frontend is configured with:
- Standalone output mode for smaller deployments
- TypeScript error tolerance (for faster deployments)
- ESLint error tolerance (for faster deployments)

To enforce stricter builds, modify `next.config.js`:
```javascript
typescript: {
  ignoreBuildErrors: false,
},
eslint: {
  ignoreDuringBuilds: false,
}
```

## Monitoring and Logs

1. **View Logs**
   - Go to your service in Render Dashboard
   - Click "Logs" to see real-time logs
   - Use filters to find specific errors

2. **Monitor Performance**
   - Check "Metrics" tab for CPU, Memory usage
   - Set up alerts for high usage

3. **Health Checks**
   - Render automatically pings `/` endpoint
   - Ensure your homepage loads correctly

## Troubleshooting

### Build Failures

1. **Module not found errors**
   ```bash
   # Ensure all dependencies are in package.json
   npm install [missing-package]
   git add package.json package-lock.json
   git commit -m "Add missing dependency"
   git push
   ```

2. **Build timeout**
   - Upgrade to a paid plan for longer build times
   - Optimize build by removing unused dependencies

### Runtime Errors

1. **API connection issues**
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check backend CORS configuration
   - Ensure backend is running

2. **Missing environment variables**
   - Check all required variables are set
   - Restart service after adding variables

### Performance Issues

1. **Slow initial load**
   - Normal for free tier (cold starts)
   - Upgrade to Starter plan for better performance

2. **Memory issues**
   - Monitor memory usage in Metrics
   - Optimize image sizes and imports
   - Consider upgrading plan

## Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Environment variables configured
- [ ] Repository connected to Render
- [ ] Build command tested locally: `npm run build`
- [ ] CORS configured on backend
- [ ] Stripe Publishable Key added
- [ ] Custom domain configured (optional)
- [ ] Health checks passing
- [ ] SSL certificate active
- [ ] Monitoring alerts set up

## Rolling Back Deployments

1. Go to your service in Render Dashboard
2. Click "Events" tab
3. Find a previous successful deployment
4. Click "Rollback to this deploy"

## Continuous Deployment

- Pushes to the configured branch trigger automatic deployments
- Disable auto-deploy in service settings if needed
- Use manual deploys for more control

## Support Resources

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- Next.js on Render: https://render.com/docs/deploy-nextjs
- Support: support@render.com

## Next Steps

1. Deploy the frontend following this guide
2. Test all functionality thoroughly
3. Set up monitoring and alerts
4. Configure custom domain
5. Enable Google Analytics (optional)
6. Set up error tracking (e.g., Sentry)
