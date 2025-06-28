# 6FB Booking Platform - Deployment Guide

This guide covers deployment options for both backend and frontend services.

## Table of Contents
- [Frontend Deployment](#frontend-deployment)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Render](#render)
  - [Netlify](#netlify)
  - [Docker](#docker)
- [Backend Deployment](#backend-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment Steps](#post-deployment-steps)

## Frontend Deployment

### Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### Option 1: Deploy via Vercel CLI
```bash
cd frontend-v2
npm i -g vercel
vercel
```

#### Option 2: Deploy via GitHub Integration
1. Push your code to GitHub
2. Import project at https://vercel.com/import
3. Select the `frontend-v2` directory as root
4. Environment variables will be loaded from `vercel.json`

#### Required Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
```

### Render

Deploy as a Node.js service using the existing `render.yaml`:

```bash
# From the root directory
git push origin main
```

Render will automatically deploy both backend and frontend services.

### Netlify

#### Option 1: Deploy via Netlify CLI
```bash
cd frontend-v2
npm i -g netlify-cli
netlify deploy --prod
```

#### Option 2: Deploy via GitHub Integration
1. Connect your GitHub repository at https://app.netlify.com
2. Set base directory to `frontend-v2`
3. Build command: `npm run build`
4. Publish directory: `.next`

### Docker

#### Local Development
```bash
# From the root directory
docker-compose up -d
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:8000
- PostgreSQL at localhost:5432

#### Production Docker Build
```bash
cd frontend-v2
docker build -t 6fb-frontend:latest .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-backend-url.com \
  -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key \
  6fb-frontend:latest
```

## Backend Deployment

The backend is already configured for deployment on Render. See the main README for backend deployment instructions.

Current production backend URL: https://sixfb-backend.onrender.com

## Environment Variables

### Frontend Environment Variables

Create a `.env.local` file in the `frontend-v2` directory:

```env
# Required
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key

# Optional
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Backend Environment Variables

See the backend `.env.template` file for required backend environment variables.

## Post-Deployment Steps

### 1. Verify API Connection
```bash
curl https://your-frontend-url.com/api/health
```

### 2. Test Authentication Flow
1. Navigate to `/login`
2. Create a test account
3. Verify dashboard access

### 3. Test Booking Flow
1. Navigate to `/book`
2. Select a service and time
3. Complete payment with Stripe test card: `4242 4242 4242 4242`

### 4. Configure Webhooks
For production, update Stripe webhook endpoints:
```
Backend webhook: https://your-backend-url.com/webhooks/stripe
```

### 5. Set up Monitoring
- Vercel: Built-in analytics and monitoring
- Render: Configure health checks in dashboard
- Netlify: Use Netlify Analytics

## SSL/TLS Configuration

All recommended platforms (Vercel, Render, Netlify) provide automatic SSL certificates.

For Docker deployments, use a reverse proxy like Nginx or Traefik with Let's Encrypt.

## Scaling Considerations

### Frontend
- Vercel: Automatic scaling with edge functions
- Render: Upgrade to paid plan for autoscaling
- Docker: Use Kubernetes or Docker Swarm

### Backend
- Configure connection pooling for PostgreSQL
- Use Redis for session management (optional)
- Enable API rate limiting for production

## Troubleshooting

### API Connection Issues
1. Check CORS configuration in backend
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Test API directly: `curl https://your-backend-url.com/health`

### Build Failures
1. Clear `.next` directory: `rm -rf .next`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check Node.js version: Should be 18.x or higher

### Production Issues
1. Check browser console for errors
2. Verify environment variables in deployment platform
3. Check API logs in backend deployment

## Support

For deployment issues:
1. Check deployment platform documentation
2. Review error logs in platform dashboard
3. Test locally with production environment variables