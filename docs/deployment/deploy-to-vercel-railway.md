# 🚀 Deploy to Vercel + Railway - Quick Guide

## Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository
4. Select "Deploy from Root Directory" and set:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. Add Environment Variables:
```
SECRET_KEY=vKhm6Owv8j20KUolXiC58bsOF3Wis3lwU/L/BhUfsXeG79I+MFZh/y8MS69Pbtqp
JWT_SECRET_KEY=VqrxTWVBChpnT1gTDciBZqWiOfJ42LI28slNWHgrJQ6hgQWmsvqe4YyWzZNjxJGX
ENVIRONMENT=production
FRONTEND_URL=https://6fb-booking.vercel.app
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
SENDGRID_API_KEY=[YOUR_SENDGRID_KEY]
FROM_EMAIL=noreply@yourapp.com
```

6. Add PostgreSQL database:
   - Click "New" → "Database" → "Add PostgreSQL"
   - DATABASE_URL will be automatically set

## Step 2: Deploy Frontend to Vercel

```bash
cd frontend
npx vercel --prod
```

Follow the prompts:
- Project name: 6fb-booking
- Directory: ./
- Framework: Next.js

Add environment variables in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://[your-railway-backend-url]
```

## Step 3: Update CORS

Update your Railway backend environment:
```
FRONTEND_URL=https://6fb-booking.vercel.app
```

## Total Cost: ~$20-30/month
- Railway (Backend + DB): $20/month
- Vercel: Free (Pro $20/month for more)

Your app will be live at:
- Frontend: https://6fb-booking.vercel.app
- Backend: https://[random-name].railway.app

## Advantages:
- ⚡ Super fast global CDN (Vercel)
- 🔄 Auto-deployments on git push
- 📊 Built-in analytics
- 🛡️ Enterprise-grade security
