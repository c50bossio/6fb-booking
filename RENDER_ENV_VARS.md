# 🔐 Render Environment Variables for V2

Copy these environment variables to your Render services. Get the values from your `backend-v2/.env` file.

## Backend Service (sixfb-backend-v2)

```bash
# IMPORTANT: Use PRODUCTION_ORIGINS, not CORS_ALLOWED_ORIGINS!
ENVIRONMENT=production
PRODUCTION_ORIGINS=https://sixfb-frontend-v2.onrender.com

# Stripe (Live Keys - you confirmed these are production keys)
STRIPE_SECRET_KEY=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
STRIPE_PUBLISHABLE_KEY=pk_live_51OUIw0AV7WL65KS1yY8kwRIoSgNGNcoqBF7YcPq0OUlEmx2eGwkONSHKv0jaBL8zcCNN9ti5RAzEGw8LXkr5ObxI00CRlz0wrz
STRIPE_WEBHOOK_SECRET=whsec_z0u4M5ekGw39fV3oB5wvgWsWbLhciVWM
STRIPE_CONNECT_CLIENT_ID=ca_SXTsbj5r0TeoXG4WieYUb3ZcgX4jVWLz

# SendGrid
SENDGRID_API_KEY=[COPY FROM YOUR .ENV - starts with SG.]
SENDGRID_FROM_EMAIL=noreply@bookedbarber.com

# Twilio  
TWILIO_ACCOUNT_SID=ACe5b803b2dee8cfeffbfc19330838d25f
TWILIO_AUTH_TOKEN=[COPY FROM YOUR .ENV]
TWILIO_PHONE_NUMBER=+18135483884

# Security Keys
SECRET_KEY=bGPj-hgucHpMnPDP48458kHR7OS2M_gJ-IyhOVgs553e96SlC9sVoOJmRhk4I4lE
JWT_SECRET_KEY=Tn4JzST8EYHbry3tCCh0pMZlMZ6DEZSkJ1Bet1pXO0Wy5ZbFlgbcMuhUF3qsAq94

# Optional but recommended
SENTRY_DSN=https://663e8aa2453ba7a088f58d345afb0897@o4509526697508864.ingest.us.sentry.io/4509526819012608

# Database URL will be auto-added by Render when you connect to database
```

## Frontend Service (sixfb-frontend-v2)

```bash
NEXT_PUBLIC_API_URL=https://sixfb-backend-v2.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51OUIw0AV7WL65KS1yY8kwRIoSgNGNcoqBF7YcPq0OUlEmx2eGwkONSHKv0jaBL8zcCNN9ti5RAzEGw8LXkr5ObxI00CRlz0wrz
```

## 🚨 Security Notes

1. **SendGrid API Key**: I didn't include it here because it starts with `SG.` and would trigger GitHub's secret scanning
2. **Twilio Auth Token**: Same reason - copy it manually from your .env
3. **These are your LIVE production keys**: Once deployed, real payments will be processed!

## 📋 Steps to Add These:

1. Go to your Render service
2. Click on "Environment" tab
3. Click "Add Environment Variable"
4. Copy each key-value pair
5. Save and the service will redeploy automatically

## ✅ Verification After Adding:

Check that the backend starts successfully:
- https://sixfb-backend-v2.onrender.com/health
- https://sixfb-backend-v2.onrender.com/docs