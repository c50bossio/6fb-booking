# 🚀 Deploy to Render - Quick Guide

## Step 1: Prepare Repository
```bash
# Commit current state
git add .
git commit -m "Production-ready deployment"
git push origin main
```

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: 6fb-booking-backend
   - **Environment**: Python 3
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Starter ($7/month)

5. Add Environment Variables:
```
SECRET_KEY=vKhm6Owv8j20KUolXiC58bsOF3Wis3lwU/L/BhUfsXeG79I+MFZh/y8MS69Pbtqp
JWT_SECRET_KEY=VqrxTWVBChpnT1gTDciBZqWiOfJ42LI28slNWHgrJQ6hgQWmsvqe4YyWzZNjxJGX
DATABASE_URL=[PROVIDED_BY_RENDER_POSTGRESQL]
ENVIRONMENT=production
FRONTEND_URL=https://6fb-booking-frontend.onrender.com
STRIPE_SECRET_KEY=sk_test_your_test_key  # Use test keys initially
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
SENDGRID_API_KEY=[YOUR_SENDGRID_KEY]
FROM_EMAIL=noreply@yourapp.com
```

## Step 3: Deploy Frontend to Render

1. Click "New" → "Static Site"
2. Connect same repository
3. Use these settings:
   - **Name**: 6fb-booking-frontend
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `backend-v2/frontend-v2/out`

4. Add Environment Variables:
```
NEXT_PUBLIC_API_URL=https://6fb-booking-backend.onrender.com
```

## Step 4: Add PostgreSQL Database

1. In backend service, go to "Environment" tab
2. Click "Add Database" → "PostgreSQL"
3. The DATABASE_URL will be automatically set

## Step 5: Deploy!

Click "Create Web Service" for both services. Deployment takes ~5-10 minutes.

## Total Cost: ~$14/month
- Backend: $7/month
- Database: $7/month
- Frontend: Free

Your app will be live at:
- Frontend: https://6fb-booking-frontend.onrender.com
- Backend: https://6fb-booking-backend.onrender.com

## Post-Deployment Checklist:
- ✅ Test login: admin@6fb.com / admin123
- ✅ Test booking flow
- ✅ Test payment processing (with test keys)
- ✅ Update Stripe webhook URL in Stripe dashboard
