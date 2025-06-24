# 6FB Booking Frontend - Render Deployment Guide

Complete guide for deploying the 6FB Booking frontend to Render.com as a backup to Vercel.

## 🚀 Quick Start

1. **Automated Setup** (Recommended):
   ```bash
   ./deploy-to-render.sh static
   ```

2. **Manual Setup**: Follow the detailed steps below

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub repository with your code
- Render.com account
- Environment variables ready

## 🎯 Deployment Options

### Option 1: Static Site Deployment (Recommended)

**Pros:**
- ✅ Faster performance
- ✅ Better caching
- ✅ Lower cost (free tier available)
- ✅ Better for SEO
- ✅ CDN distribution

**Cons:**
- ❌ No server-side rendering at runtime
- ❌ No API routes
- ❌ Requires build-time data fetching

### Option 2: Server Deployment (Fallback)

**Pros:**
- ✅ Full Next.js features
- ✅ Server-side rendering
- ✅ API routes support
- ✅ Runtime data fetching

**Cons:**
- ❌ Higher cost
- ❌ Slower cold starts
- ❌ More resource intensive

## 🛠️ Setup Instructions

### 1. Prepare Your Repository

Ensure these files are in your repository:
- `render.yaml` (deployment config)
- `next.config.render.js` (static build config)
- `package.json` (with build:render script)

### 2. Create Render Service

#### For Static Site:
1. Go to https://dashboard.render.com
2. Click "New +" → "Static Site"  
3. Connect your GitHub repository
4. Select the `6fb-booking` repository
5. Configure:
   - **Name**: `sixfb-frontend-static`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build:render`
   - **Publish Directory**: `out`

#### For Server Deployment:
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository  
4. Select the `6fb-booking` repository
5. Configure:
   - **Name**: `sixfb-frontend-server`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`

### 3. Environment Variables

#### Required Variables:
```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=6FB Booking Platform
```

#### Feature Flags:
```bash
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_DEMO_MODE=false
```

#### Payment Integration:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

#### Authentication (if using NextAuth):
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Optional:
```bash
NEXT_PUBLIC_WS_URL=wss://sixfb-backend.onrender.com/ws
NEXT_PUBLIC_IMAGE_DOMAINS=localhost,stripe.com,sixfb-backend.onrender.com
NEXT_PUBLIC_CACHE_TTL=3600000
PORT=3000  # For server deployment only
```

### 4. Deploy

1. Click "Create Static Site" or "Create Web Service"
2. Wait for build and deployment (5-15 minutes)
3. Your app will be available at: `https://your-app-name.onrender.com`

## 🔧 Build Configuration

### Static Build Process:
```bash
# Uses next.config.render.js for static export
NEXT_CONFIG_FILE=next.config.render.js next build
```

### Server Build Process:
```bash
# Uses default next.config.js
next build
```

## 🌐 URLs and Endpoints

| Service | URL |
|---------|-----|
| Frontend (Static) | https://sixfb-frontend-static.onrender.com |
| Frontend (Server) | https://sixfb-frontend-server.onrender.com |
| Backend API | https://sixfb-backend.onrender.com/api/v1 |
| WebSocket | wss://sixfb-backend.onrender.com/ws |

## ✅ Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] API connections work (check Network tab)
- [ ] Authentication works
- [ ] Payment processing works
- [ ] Calendar functionality works
- [ ] Responsive design works
- [ ] No CORS errors in console
- [ ] WebSocket connections work (if enabled)

## 🔍 Testing

### Test Login:
- Email: `c50bossio@gmail.com`
- Password: `Welcome123!`

### Test API Connectivity:
```bash
# Test backend health
curl https://sixfb-backend.onrender.com/api/v1/health

# Test frontend
curl https://your-app-name.onrender.com
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. Build Failures
```bash
# Check logs in Render dashboard
# Common fixes:
- Verify Node.js version (18+)
- Check package.json scripts
- Ensure all dependencies listed
- Check for TypeScript errors
```

#### 2. API Connection Issues
```bash
# Verify environment variables:
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1

# Check CORS settings in backend
# Ensure backend is running
```

#### 3. Static Build Issues
```bash
# Common Next.js static export issues:
- Remove API routes from pages/api
- Use getStaticProps instead of getServerSideProps
- Ensure all images use unoptimized: true
- Check for dynamic imports
```

#### 4. Runtime Errors
```bash
# Check browser console
# Check Render logs
# Verify environment variables are set
# Check for missing dependencies
```

## 🔄 Updates and Maintenance

### Auto-Deploy:
- Enabled by default
- Triggers on git push to main branch
- Check deployment status in Render dashboard

### Manual Deploy:
1. Go to Render dashboard
2. Select your service
3. Click "Manual Deploy"
4. Choose branch and deploy

## 💰 Pricing Comparison

| Feature | Static Site | Web Service |
|---------|-------------|-------------|
| **Cost** | Free tier available | $7/month starter |
| **Performance** | Excellent (CDN) | Good |
| **Scalability** | Automatic | Manual |
| **Cold Starts** | None | ~30 seconds |
| **Build Time** | 5-10 minutes | 10-15 minutes |

## 🎯 Performance Optimization

### Static Site:
- Uses CDN for global distribution
- Automatic image optimization
- Brotli compression
- HTTP/2 support

### Server Deployment:
- Consider upgrading plan for better performance
- Enable caching headers
- Optimize bundle size

## 🔒 Security

### Headers Applied:
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Best Practices:
- Keep environment variables secure
- Use HTTPS only
- Regular security updates
- Monitor for vulnerabilities

## 📊 Monitoring

### Available Metrics:
- Build times
- Deployment success/failure
- Response times
- Error rates
- Bandwidth usage

### Access Logs:
- Available in Render dashboard
- Filter by time range
- Download for analysis

## 🆚 Render vs Vercel Comparison

| Feature | Render | Vercel |
|---------|--------|--------|
| **Static Sites** | ✅ Free tier | ✅ Generous free tier |
| **Server Functions** | ✅ Full Node.js | ✅ Serverless functions |
| **Database** | ✅ PostgreSQL included | ❌ External required |
| **Custom Domains** | ✅ Free SSL | ✅ Free SSL |
| **GitHub Integration** | ✅ Auto-deploy | ✅ Auto-deploy |
| **Build Minutes** | Limited | Generous |
| **Global CDN** | ✅ Yes | ✅ Yes |
| **Pricing** | Predictable | Usage-based |

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [6FB Backend Render Setup](../backend/RENDER_DEPLOYMENT.md)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Render dashboard logs
3. Check GitHub Actions (if configured)
4. Contact support via Render dashboard

---

**Last Updated**: June 24, 2025  
**Version**: 2.0  
**Status**: Production Ready ✅