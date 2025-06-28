# 🚂 Railway Frontend Environment Variables Setup Guide

## 🎯 Overview
This guide provides secure setup instructions for configuring Railway environment variables for the 6FB Booking frontend deployment, ensuring no secrets are committed to your repository.

---

## 📋 Required Environment Variables for Railway Frontend

### 🔒 Core Configuration Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app/api/v1

# Environment Identification
NEXT_PUBLIC_ENVIRONMENT=production

# App Configuration
NEXT_PUBLIC_APP_NAME=6FB Booking Platform
NEXT_PUBLIC_APP_URL=https://your-frontend-service.railway.app

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true

# Image Optimization
NEXT_PUBLIC_IMAGE_DOMAINS=localhost,stripe.com,your-domain.com

# Cache Configuration
NEXT_PUBLIC_CACHE_TTL=300000
```

### 💳 Stripe Configuration (Payment Processing)

```env
# Stripe Publishable Key (Safe to expose publicly)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
```

### 🔌 Optional Service Integrations

```env
# WebSocket Configuration
NEXT_PUBLIC_WS_URL=wss://your-backend-service.railway.app/ws

# Google Analytics (Optional)
NEXT_PUBLIC_GA_TRACKING_ID=UA-XXXXXXXXX-X

# PostHog Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Google Maps API (Optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## 🔐 Secure Configuration Strategy

### ✅ Safe Environment Variables (Public)
These variables are prefixed with `NEXT_PUBLIC_` and are safe to expose in the browser:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_`)
- `NEXT_PUBLIC_APP_URL`
- All feature flags and configuration options

### ❌ Never Include in Frontend
These should NEVER be in frontend environment variables:
- Stripe secret keys (`sk_test_` or `sk_live_`)
- Database credentials
- JWT secrets
- API private keys
- Webhook secrets

---

## 🚂 Step-by-Step Railway Dashboard Setup

### Step 1: Access Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub/Google
3. Navigate to your frontend project

### Step 2: Configure Environment Variables
1. Click on your **Frontend Service**
2. Go to **Variables** tab
3. Click **+ New Variable**

### Step 3: Add Each Variable Individually

#### Core Variables (Add these first):
```bash
# Variable Name: NEXT_PUBLIC_API_URL
# Value: https://your-backend-service.railway.app/api/v1

# Variable Name: NEXT_PUBLIC_ENVIRONMENT
# Value: production

# Variable Name: NEXT_PUBLIC_APP_NAME
# Value: 6FB Booking Platform

# Variable Name: NEXT_PUBLIC_APP_URL
# Value: https://your-frontend-service.railway.app
```

#### Stripe Configuration:
```bash
# Variable Name: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Value: pk_live_your_actual_publishable_key_here
```

#### Feature Flags:
```bash
# Variable Name: NEXT_PUBLIC_ENABLE_ANALYTICS
# Value: true

# Variable Name: NEXT_PUBLIC_ENABLE_WEBSOCKET
# Value: true

# Variable Name: NEXT_PUBLIC_ENABLE_PAYMENTS
# Value: true
```

#### Performance & Optimization:
```bash
# Variable Name: NEXT_PUBLIC_IMAGE_DOMAINS
# Value: localhost,stripe.com,your-domain.com

# Variable Name: NEXT_PUBLIC_CACHE_TTL
# Value: 300000
```

### Step 4: Optional Services (Add if needed):
```bash
# WebSocket (if using real-time features)
# Variable Name: NEXT_PUBLIC_WS_URL
# Value: wss://your-backend-service.railway.app/ws

# Google Analytics (if using analytics)
# Variable Name: NEXT_PUBLIC_GA_TRACKING_ID
# Value: UA-XXXXXXXXX-X

# PostHog (if using advanced analytics)
# Variable Name: NEXT_PUBLIC_POSTHOG_KEY
# Value: your_posthog_key

# Variable Name: NEXT_PUBLIC_POSTHOG_HOST
# Value: https://app.posthog.com
```

---

## 🔑 Stripe Configuration Details

### Getting Your Stripe Publishable Key

#### For Test Environment:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy the **Publishable key** (starts with `pk_test_`)
4. Use: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here`

#### For Production Environment:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle to **Live mode** (top right)
3. Navigate to **Developers** → **API Keys**
4. Copy the **Publishable key** (starts with `pk_live_`)
5. Use: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here`

### ⚠️ Stripe Security Notes:
- **Publishable keys** are safe to expose publicly
- **Secret keys** should NEVER be in frontend environment variables
- Always use live keys for production deployments
- Test keys are fine for staging/development

---

## 🔧 Railway-Specific Configuration

### Build & Start Commands
Railway should automatically detect your Next.js app, but you can specify:

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

### Port Configuration
Railway automatically assigns the `PORT` environment variable. Your Next.js app will automatically use it.

### Custom Domain Setup (Optional)
1. In Railway dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Update `NEXT_PUBLIC_APP_URL` to match your domain
4. Configure DNS records as instructed

---

## 📋 Environment Variables Checklist

### ✅ Minimum Required Variables:
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_ENVIRONMENT`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### ✅ Recommended Variables:
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_ENABLE_PAYMENTS`
- [ ] `NEXT_PUBLIC_ENABLE_ANALYTICS`
- [ ] `NEXT_PUBLIC_IMAGE_DOMAINS`
- [ ] `NEXT_PUBLIC_CACHE_TTL`

### ✅ Optional Variables (Add if using):
- [ ] `NEXT_PUBLIC_WS_URL` (WebSocket)
- [ ] `NEXT_PUBLIC_GA_TRACKING_ID` (Google Analytics)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` (PostHog)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps)

---

## 🚀 Deployment Process

### 1. Set Environment Variables (above steps)

### 2. Deploy from GitHub
1. Connect your GitHub repository to Railway
2. Select the frontend directory if in a monorepo
3. Railway will automatically build and deploy

### 3. Verify Deployment
1. Check the deployment logs for any errors
2. Visit your Railway-provided URL
3. Test the connection to your backend API
4. Verify Stripe integration (if enabled)

### 4. Test Environment Variables
Add this to your Next.js app to verify variables are loaded:
```javascript
// In your browser console or a test page
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Environment:', process.env.NEXT_PUBLIC_ENVIRONMENT);
console.log('Stripe Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
```

---

## 🔍 Troubleshooting

### Common Issues & Solutions:

#### ❌ "API connection failed"
- **Check**: `NEXT_PUBLIC_API_URL` is correct
- **Verify**: Backend service is running
- **Test**: Visit the API URL directly in browser

#### ❌ "Stripe not loading"
- **Check**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- **Verify**: Key starts with `pk_test_` or `pk_live_`
- **Test**: Check browser network tab for Stripe requests

#### ❌ "Environment variables not loading"
- **Check**: All variables have `NEXT_PUBLIC_` prefix
- **Verify**: Variables are set in Railway dashboard
- **Restart**: Redeploy the service after adding variables

#### ❌ "Build failing"
- **Check**: No syntax errors in environment variable values
- **Verify**: No quotes around values in Railway dashboard
- **Review**: Build logs in Railway dashboard

---

## 🔐 Security Best Practices

### ✅ Do:
- Use `NEXT_PUBLIC_` prefix for all frontend variables
- Use Stripe publishable keys (not secret keys)
- Set `NEXT_PUBLIC_ENVIRONMENT=production` for live deployments
- Regularly rotate API keys and tokens
- Use different keys for staging vs production

### ❌ Don't:
- Include any secret keys in frontend environment variables
- Commit `.env` files to your repository
- Use test keys in production
- Expose database credentials
- Include JWT secrets or webhook secrets

---

## 📞 Support & Resources

### Railway Documentation:
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Next.js Deployment](https://docs.railway.app/guides/nextjs)

### Stripe Documentation:
- [API Keys Guide](https://stripe.com/docs/keys)
- [Frontend Integration](https://stripe.com/docs/stripe-js)

### Next.js Documentation:
- [Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Deployment](https://nextjs.org/docs/deployment)

---

## 🎯 Quick Start Commands

### Copy Environment Variables Template:
```bash
# Create a local reference file (DO NOT COMMIT)
cp /dev/null .env.railway.template

cat << 'EOF' > .env.railway.template
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app/api/v1
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=6FB Booking Platform
NEXT_PUBLIC_APP_URL=https://your-frontend-service.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_IMAGE_DOMAINS=localhost,stripe.com
NEXT_PUBLIC_CACHE_TTL=300000
EOF

echo "Template created! Edit values and add to Railway dashboard manually."
echo "⚠️  DO NOT commit this file to git!"
```

### Verify Setup:
```bash
# Test API connection after deployment
curl https://your-frontend-service.railway.app/api/health

# Check environment variables are loaded (browser console)
console.log(Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));
```

---

## ✅ Final Deployment Checklist

Before going live, ensure:

- [ ] All required environment variables are set in Railway dashboard
- [ ] Stripe publishable key is for the correct environment (live for production)
- [ ] `NEXT_PUBLIC_API_URL` points to your deployed backend
- [ ] `NEXT_PUBLIC_APP_URL` matches your actual domain
- [ ] No secret keys are included in environment variables
- [ ] Frontend builds and deploys successfully
- [ ] API connection test passes
- [ ] Payment integration works (if enabled)
- [ ] Custom domain is configured (if using)

**🎉 Your Railway frontend deployment should now be secure and fully configured!**
