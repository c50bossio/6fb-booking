# Railway Frontend Environment Setup Guide

This guide helps you configure environment variables for the 6FB Booking Platform frontend on Railway.

## 📋 Files in This Directory

- **`railway-frontend-env-setup.sh`** - Interactive setup script with instructions
- **`railway-frontend-env.txt`** - Copy-paste ready environment variables
- **`verify-railway-env.js`** - Environment variables verification script
- **`RAILWAY_FRONTEND_SETUP_README.md`** - This guide

## 🚀 Quick Start

### Method 1: Using the Interactive Script

```bash
# Run the setup script to see all environment variables and instructions
./railway-frontend-env-setup.sh
```

### Method 2: Copy-Paste from Configuration File

1. Open `railway-frontend-env.txt`
2. Copy the environment variables you need
3. Paste them into Railway's Variables tab

## 🔧 Setting Environment Variables in Railway

### Via Railway Dashboard (Recommended)

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your frontend project/service
3. Click on the **"Variables"** tab
4. Click **"Add Variable"** for each environment variable
5. Copy the variable name and value from `railway-frontend-env.txt`

### Via Railway CLI (Alternative)

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set variables (replace URLs with your actual Railway URLs)
railway variables set NEXT_PUBLIC_API_URL="https://your-backend-railway-app.railway.app/api/v1"
railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE"
# ... (see railway-frontend-env-setup.sh for full list)
```

## 🔑 Required Environment Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | `https://your-backend.railway.app/api/v1` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key for payments | `pk_test_...` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | `353647126065-...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret (server-side) | `GOCSPX-...` |
| `NEXTAUTH_URL` | Your frontend URL | `https://your-frontend.railway.app` |
| `NEXTAUTH_SECRET` | Secure random string | Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint | `wss://your-backend.railway.app/ws` |

## ⚙️ Important Configuration Notes

### 1. Replace Placeholder URLs

**Before deploying, you MUST replace these placeholder URLs:**

- `your-backend-railway-app.railway.app` → Your actual backend Railway URL
- `your-frontend-railway-app.railway.app` → Your actual frontend Railway URL

### 2. Generate Secure NEXTAUTH_SECRET

```bash
# Generate a secure secret
openssl rand -base64 32
```

### 3. Production vs Test Keys

- The provided Stripe key is for **testing only**
- For production, use your live Stripe publishable key
- Test keys start with `pk_test_`, live keys start with `pk_live_`

### 4. Environment Variables Visibility

- **`NEXT_PUBLIC_*`** variables are exposed to the browser
- Variables without `NEXT_PUBLIC_` are server-side only
- Never put sensitive secrets in `NEXT_PUBLIC_` variables

## ✅ Verification

### Method 1: Using the Verification Script

```bash
# In your frontend project, run:
node /path/to/verify-railway-env.js
```

### Method 2: Browser Console

1. Open your deployed frontend
2. Open browser developer tools (F12)
3. In the console, type:

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Stripe Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
```

### Method 3: Railway Dashboard

1. Go to your frontend service in Railway
2. Click "Variables" tab
3. Verify all required variables are listed

## 🚨 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **API calls failing** | Check `NEXT_PUBLIC_API_URL` points to your backend |
| **Authentication not working** | Verify `NEXTAUTH_URL` and `NEXTAUTH_SECRET` |
| **Stripe payments failing** | Confirm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is correct |
| **Google login broken** | Check Google OAuth credentials |
| **WebSocket not connecting** | Verify `NEXT_PUBLIC_WS_URL` is correct |

### Debug Steps

1. **Check Railway Deployment Logs:**
   ```bash
   railway logs
   ```

2. **Test Environment Variables:**
   - Add a test API endpoint that returns environment variables
   - Check browser network tab for failed API calls

3. **Verify CORS Settings:**
   - Ensure your backend allows requests from your frontend domain
   - Check browser console for CORS errors

## 🔐 Security Checklist

- [ ] Generated unique `NEXTAUTH_SECRET`
- [ ] Using production Stripe keys for live deployment
- [ ] All sensitive data in server-side variables (no `NEXT_PUBLIC_`)
- [ ] URLs use HTTPS (not HTTP)
- [ ] Google OAuth configured for correct domain

## 📁 Project Structure

```
/scripts/
├── railway-frontend-env-setup.sh     # Interactive setup guide
├── railway-frontend-env.txt          # Environment variables list
├── verify-railway-env.js             # Verification script
└── RAILWAY_FRONTEND_SETUP_README.md  # This guide
```

## 🎯 Next Steps After Setup

1. **Deploy your frontend** to Railway
2. **Test the application** functionality
3. **Verify API connectivity** works
4. **Test authentication** flows
5. **Confirm payment processing** works
6. **Check WebSocket** connections (if enabled)

## 📞 Support

If you encounter issues:

1. Check Railway deployment logs
2. Verify all environment variables are set correctly
3. Test API endpoints manually
4. Review browser console for errors
5. Confirm backend CORS configuration

---

**Created for 6FB Booking Platform**  
*Last updated: 2025-06-25*