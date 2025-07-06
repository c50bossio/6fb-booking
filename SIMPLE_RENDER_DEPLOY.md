# 🚀 Simplest Way to Deploy V2 to Render

Since GitHub is blocking pushes with secrets, here's the absolute simplest deployment method:

## Option 1: Manual Service Creation (10 minutes)

### Step 1: Create Backend Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. **Public Git repository**: Enter `https://github.com/c50bossio/6fb-booking`
4. **Name**: `sixfb-backend-v2`
5. **Environment**: Python 3
6. **Branch**: `main` (we'll deploy from main since our branch has secrets)
7. **Root Directory**: `backend-v2`
8. **Build Command**: `pip install -r requirements.txt`
9. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
10. Click "Create Web Service"

### Step 2: Add Backend Environment Variables
In the service's Environment tab, add these from your `backend-v2/.env`:
```
STRIPE_SECRET_KEY = [your live key]
STRIPE_PUBLISHABLE_KEY = [your live key]
STRIPE_WEBHOOK_SECRET = [your webhook secret]
STRIPE_CONNECT_CLIENT_ID = [your connect ID]
SENDGRID_API_KEY = [your sendgrid key]
SENDGRID_FROM_EMAIL = noreply@bookedbarber.com
TWILIO_ACCOUNT_SID = [your sid]
TWILIO_AUTH_TOKEN = [your auth token]
TWILIO_PHONE_NUMBER = [your phone]
SECRET_KEY = [from your .env]
JWT_SECRET_KEY = [from your .env]
ENVIRONMENT = production
CORS_ALLOWED_ORIGINS = https://sixfb-frontend-v2.onrender.com
```

### Step 3: Create Frontend Service
1. Click "New +" → "Web Service" again
2. **Public Git repository**: `https://github.com/c50bossio/6fb-booking`
3. **Name**: `sixfb-frontend-v2`
4. **Environment**: Node
5. **Branch**: `main`
6. **Root Directory**: `backend-v2/frontend-v2`
7. **Build Command**: `npm ci && npm run build`
8. **Start Command**: `npm start`
9. Click "Create Web Service"

### Step 4: Add Frontend Environment Variables
```
NEXT_PUBLIC_API_URL = https://sixfb-backend-v2.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = [your publishable key]
```

### Step 5: Create or Connect Database
- If you need a new database: "New +" → "PostgreSQL"
- Or connect to existing `sixfb-db`
- Copy the Internal Database URL
- Add to Backend as: `DATABASE_URL = [postgresql url]`

## Option 2: Use Render's Shell to Deploy

If the above doesn't work because of the branch issue:

1. Create empty services first (without connecting to Git)
2. Use Render's shell to manually upload code:
   ```bash
   # In Render shell for backend
   git clone https://github.com/c50bossio/6fb-booking.git .
   cd backend-v2
   pip install -r requirements.txt
   ```

## ✅ Verification After Deployment

1. Backend Health Check:
   ```
   https://sixfb-backend-v2.onrender.com/health
   ```

2. Frontend:
   ```
   https://sixfb-frontend-v2.onrender.com
   ```

3. API Docs:
   ```
   https://sixfb-backend-v2.onrender.com/docs
   ```

## 🎯 That's It!

This manual approach bypasses all the Git secret issues. You're just:
1. Creating services
2. Pointing to your public repo
3. Adding environment variables
4. Deploying

Total time: ~10-15 minutes including build time.