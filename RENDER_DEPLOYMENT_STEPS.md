# 🚀 Render Deployment Steps

## Step 1: Add Webhook Secret to Backend (5 minutes)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Find your backend service**: Look for `sixfb-backend`
3. **Click on the service** → Go to "Environment" tab
4. **Add this environment variable**:
   ```
   STRIPE_WEBHOOK_SECRET = whsec_eh49qe3Qp14l64bqG2wROGaTVoJjjDC3
   ```
5. **Save changes** - Your backend will automatically redeploy

## Step 2: Get Your Render API Key (2 minutes)

1. **Go to Account Settings**: https://dashboard.render.com/account/settings
2. **Click "API Keys"** in the left sidebar
3. **Click "Create API Key"**
4. **Name it**: "6FB Deployment"
5. **Copy the key** (starts with `rnd_`)
6. **Come back here** with the key

## Step 3: Deploy Frontend (10 minutes)

Once you have your API key, run these commands:

```bash
# Set your API key
export RENDER_API_KEY='rnd_YOUR_KEY_HERE'

# Deploy frontend
cd /Users/bossio/6fb-booking
./scripts/render-one-click-deploy.sh
```

## Step 4: Add Production Stripe Keys

After deployment, go back to your backend service in Render and add these (when you have them):

```
# Production Stripe Keys (get from Stripe Dashboard)
STRIPE_SECRET_KEY = sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY = pk_live_xxxxx
STRIPE_CONNECT_CLIENT_ID = ca_xxxxx
```

## Current Status:
- ✅ Backend: Already deployed at https://sixfb-backend.onrender.com
- ❌ Frontend: Needs deployment
- ⚠️ Webhook Secret: Needs to be added to backend
- ⚠️ Production Keys: Need to be added after testing

## Your Live URLs Will Be:
- Backend API: https://sixfb-backend.onrender.com
- API Docs: https://sixfb-backend.onrender.com/docs
- Frontend: https://sixfb-frontend.onrender.com