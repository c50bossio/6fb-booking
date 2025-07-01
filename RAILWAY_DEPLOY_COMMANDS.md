# Railway Frontend Deployment Commands

## Quick CLI Deployment:

```bash
# Install Railway CLI (if needed)
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to frontend
cd /Users/bossio/6fb-booking/backend-v2/frontend-v2

# Initialize Railway project
railway init

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL=https://sixfb-backend-v2.onrender.com
railway variables set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51QfOczDWCqEI9fQLWOGPmgLKx6k0wN4KYmh7e5J9bQe3zcEDEQRnfEkWbVt4pqcqT3UrBWj6YOI09IpfF5DfUNzQ00HbKgR6HE

# Deploy
railway up
```

## OR Dashboard Deployment:

1. Go to railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Select: c50bossio/6fb-booking
4. Branch: feature/enforcement-infrastructure-20250628
5. Root Directory: backend-v2/frontend-v2
6. Add environment variables (see above)