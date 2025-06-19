# 🚀 Trafft Integration Setup Guide

Your 6FB platform has a complete Trafft integration built-in, but it needs to be activated with your credentials.

## Step 1: Get Your Trafft API Key

1. **Log into your Trafft admin panel**
2. **Go to Settings → Integrations → API**
3. **Copy your API key** (starts with something like `sk_live_...` or similar)

## Step 2: Configure Render Environment Variables

Add these to your **Render backend service** environment variables:

### Required Variables:
```
TRAFFT_API_URL=https://api.trafft.com
TRAFFT_API_KEY=your_api_key_from_step_1
TRAFFT_WEBHOOK_SECRET=your_secure_random_string
```

### How to Add in Render:
1. Go to https://dashboard.render.com
2. Click on your **backend service** (sixfb-backend)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable above

### Generate Webhook Secret:
Use this command or any random string generator:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Step 3: Redeploy Backend

After adding environment variables:
1. **Render will automatically redeploy** your backend
2. **Wait for deployment** to complete (2-3 minutes)

## Step 4: Configure Trafft Webhooks

In your **Trafft admin panel**:
1. Go to **Settings → Integrations → Webhooks**
2. Add a new webhook with URL:
   ```
   https://sixfb-backend.onrender.com/api/v1/webhooks/trafft
   ```
3. Select these events:
   - ✅ `appointment.booked`
   - ✅ `appointment.cancelled` 
   - ✅ `appointment.updated`
   - ✅ `customer.created`

## Step 5: Test Integration

1. **Visit your API docs**: https://sixfb-backend.onrender.com/docs
2. **Test the connection**: Use `/api/trafft/status` endpoint
3. **Import existing data**: Use `/api/trafft/sync/initial` endpoint
4. **Register webhooks**: Use `/api/trafft/webhooks/register` endpoint

## Step 6: Verify Data Flow

1. **Check your dashboard**: Data should start appearing
2. **Book a test appointment** in Trafft
3. **Watch real-time sync** in your 6FB dashboard

## 🎯 What You'll See After Setup

- ✅ **Real appointments** from Trafft in your dashboard
- ✅ **Client profiles** with visit history  
- ✅ **Revenue tracking** with automatic commission calculations
- ✅ **Analytics charts** with real data
- ✅ **Payment processing** for appointment fees and tips

## 🔧 Troubleshooting

If data doesn't appear:
1. **Check environment variables** are set correctly
2. **Verify API key** is valid in Trafft
3. **Check webhook URL** is registered in Trafft
4. **View logs** at `/api/v1/sync/status/dashboard`

## 📞 Need Help?

The integration system includes:
- **Real-time webhook processing**
- **Automatic data sync** 
- **Error handling and logging**
- **Sync status dashboard**
- **Manual resync capabilities**

Just follow these steps and your Trafft data will start flowing into your 6FB platform automatically!