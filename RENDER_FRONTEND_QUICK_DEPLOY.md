# Quick Deploy: 6FB Frontend to Render

## 🚀 5-Minute Deployment Steps

### 1. Prepare Your Code
```bash
cd frontend
npm run validate:build  # Run validation checks
```

### 2. Create Render Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   ```
   Name: 6fb-booking-frontend
   Root Directory: frontend
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```

### 3. Set Environment Variables

Add these in the Render dashboard:

```bash
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
NEXT_TELEMETRY_DISABLED=1
```

### 4. Deploy

Click **"Create Web Service"** and wait ~5-10 minutes.

## 📋 Pre-flight Checklist

- [ ] Backend is deployed and accessible
- [ ] Have Stripe Publishable Key ready
- [ ] Code pushed to GitHub
- [ ] No build errors locally

## 🔗 Your URLs

- **Frontend**: `https://6fb-booking-frontend.onrender.com`
- **Backend**: `https://sixfb-backend.onrender.com`

## 🆘 Quick Fixes

**Build fails?**
```bash
npm install
npm run build  # Test locally
```

**API not connecting?**
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend CORS includes frontend URL

**Page not loading?**
- Check Render logs for errors
- Verify all environment variables are set

## 📞 Need Help?

1. Check full guide: `RENDER_FRONTEND_DEPLOYMENT_GUIDE.md`
2. View Render logs in dashboard
3. Render docs: https://render.com/docs/deploy-nextjs